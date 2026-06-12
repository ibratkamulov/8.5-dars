import { Injectable } from "@nestjs/common";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service";

type ReportRow = (string | number)[];

interface ReportDef {
  title: string;
  columns: string[];
  rows: ReportRow[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateBuffer(
    type: "pdf" | "excel",
    scope: string,
    clubId: string | null,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const def = await this.buildReportDef(scope, clubId);
    const date = new Date().toISOString().slice(0, 10);

    if (type === "pdf") {
      return {
        buffer: await this.buildPdf(def, date),
        filename: `report-${scope}-${date}.pdf`,
        contentType: "application/pdf",
      };
    }
    return {
      buffer: await this.buildExcel(def, date),
      filename: `report-${scope}-${date}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  private async buildReportDef(scope: string, clubId: string | null): Promise<ReportDef> {
    const cf = clubId ? { clubId } : {};
    const mcf = clubId ? { user: { clubId } } : {};

    switch (scope) {
      case "revenue": {
        const ranges = Array.from({ length: 12 }, (_, i) => {
          const from = new Date();
          from.setMonth(from.getMonth() - (11 - i), 1);
          from.setHours(0, 0, 0, 0);
          const to = new Date(from);
          to.setMonth(to.getMonth() + 1);
          return { from, to, label: from.toLocaleDateString("en", { month: "short", year: "numeric" }) };
        });

        const rows: ReportRow[] = await Promise.all(
          ranges.map(async ({ from, to, label }) => {
            const [paid, pending] = await Promise.all([
              this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { ...cf, status: "PAID", paidAt: { gte: from, lt: to } },
              }),
              this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { ...cf, status: "PENDING", createdAt: { gte: from, lt: to } },
              }),
            ]);
            const p = Number(paid._sum.amount ?? 0);
            const pen = Number(pending._sum.amount ?? 0);
            return [label, `$${p.toFixed(0)}`, `$${pen.toFixed(0)}`, `$${(p - pen).toFixed(0)}`];
          }),
        );
        return { title: "Monthly Revenue Report", columns: ["Month", "Paid", "Pending", "Net"], rows };
      }

      case "attendance": {
        const members = await this.prisma.memberProfile.findMany({
          where: mcf,
          include: {
            user: { select: { fullName: true, email: true } },
            attendance: { orderBy: { entryAt: "desc" }, take: 1 },
            _count: { select: { attendance: true } },
          },
          orderBy: { attendance: { _count: "desc" } },
          take: 100,
        });
        const rows: ReportRow[] = members.map((m) => [
          m.user.fullName,
          m.user.email,
          m._count.attendance,
          m.attendance[0]?.entryAt ? new Date(m.attendance[0].entryAt).toLocaleDateString() : "—",
        ]);
        return { title: "Attendance Report", columns: ["Member Name", "Email", "Total Visits", "Last Visit"], rows };
      }

      case "memberships": {
        const list = await this.prisma.membership.findMany({
          where: clubId ? { member: { user: { clubId } } } : {},
          include: { member: { include: { user: { select: { fullName: true, email: true } } } } },
          orderBy: { expiresAt: "desc" },
          take: 200,
        });
        const now = new Date();
        const rows: ReportRow[] = list.map((m) => [
          m.member.user.fullName,
          m.planName,
          m.period,
          new Date(m.startsAt).toLocaleDateString(),
          new Date(m.expiresAt).toLocaleDateString(),
          new Date(m.expiresAt) > now ? "Active" : "Expired",
        ]);
        return {
          title: "Memberships Report",
          columns: ["Member", "Plan", "Period", "Start Date", "Expiry", "Status"],
          rows,
        };
      }

      case "trainers": {
        const trainers = await this.prisma.trainerProfile.findMany({
          where: clubId ? { user: { clubId } } : {},
          include: {
            user: { select: { fullName: true, email: true } },
            members: { select: { id: true } },
            shifts: { select: { startTime: true, endTime: true } },
          },
        });
        const rows: ReportRow[] = trainers.map((t) => {
          const hours = t.shifts.reduce((sum, s) => {
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            return sum + (eh + em / 60) - (sh + sm / 60);
          }, 0);
          return [t.user.fullName, t.user.email, t.members.length, `${hours.toFixed(1)}h/week`, t.rating.toFixed(1)];
        });
        return {
          title: "Trainer Statistics Report",
          columns: ["Name", "Email", "Members", "Sched. Hours", "Rating"],
          rows,
        };
      }

      case "top-members": {
        const members = await this.prisma.memberProfile.findMany({
          where: mcf,
          include: {
            user: { select: { fullName: true, email: true } },
            _count: { select: { attendance: true } },
          },
          orderBy: { attendance: { _count: "desc" } },
          take: 20,
        });
        const rows: ReportRow[] = members.map((m, i) => [i + 1, m.user.fullName, m.user.email, m._count.attendance]);
        return { title: "Top 20 Most Active Members", columns: ["Rank", "Name", "Email", "Visits"], rows };
      }

      default:
        return { title: `Report: ${scope}`, columns: ["Info"], rows: [["No data"]] };
    }
  }

  private async buildPdf(def: ReportDef, date: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const W = 595, H = 842, M = 40;
    const ROW_H = 19, HDR_H = 24;
    const colW = (W - M * 2) / def.columns.length;
    const green = rgb(0.075, 0.812, 0.373);
    const darkText = rgb(0.05, 0.05, 0.05);
    const dimText = rgb(0.45, 0.45, 0.45);
    const stripe = rgb(0.96, 0.96, 0.96);

    let page = pdfDoc.addPage([W, H]);
    let y = H - M;

    const newPage = () => { page = pdfDoc.addPage([W, H]); y = H - M; };
    const need = (h: number) => { if (y - h < M + 20) newPage(); };
    const text = (s: string, x: number, ty: number, sz: number, isBold = false, col = darkText) =>
      page.drawText(String(s).slice(0, 45), { x, y: ty, size: sz, font: isBold ? bold : font, color: col });

    // Header block
    text("FastResult Gym CRM", M, y, 9, false, dimText); y -= 16;
    text(def.title, M, y, 17, true); y -= 12;
    text(`Generated: ${date}`, M, y, 8, false, dimText); y -= 20;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.5, color: green }); y -= 14;

    // Column headers
    need(HDR_H + ROW_H);
    page.drawRectangle({ x: M, y: y - HDR_H + 6, width: W - M * 2, height: HDR_H, color: green });
    def.columns.forEach((col, ci) => text(col.toUpperCase(), M + ci * colW + 4, y - 13, 7.5, true, rgb(0.04, 0.1, 0.04)));
    y -= HDR_H;

    // Data rows
    if (def.rows.length === 0) {
      y -= 6;
      text("No data available.", M, y, 10, false, dimText);
    } else {
      for (let ri = 0; ri < def.rows.length; ri++) {
        need(ROW_H + 4);
        if (ri % 2 === 0) page.drawRectangle({ x: M, y: y - ROW_H + 5, width: W - M * 2, height: ROW_H, color: stripe });
        def.rows[ri].forEach((cell, ci) => text(String(cell), M + ci * colW + 4, y - 12, 8));
        y -= ROW_H;
      }
    }

    // Page footer
    const pages = pdfDoc.getPages();
    pages.forEach((p, pi) => {
      p.drawText(`FastResult  |  Page ${pi + 1} of ${pages.length}`, {
        x: M, y: M - 14, size: 7, font, color: dimText,
      });
    });

    return Buffer.from(await pdfDoc.save());
  }

  private async buildExcel(def: ReportDef, date: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "FastResult";
    wb.created = new Date();
    const ws = wb.addWorksheet(def.title.slice(0, 31));
    const ncols = def.columns.length;

    // Title
    ws.mergeCells(1, 1, 1, ncols);
    Object.assign(ws.getCell("A1"), {
      value: `FastResult — ${def.title}`,
      font: { bold: true, size: 13, color: { argb: "FF0D1A0D" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF13CF5F" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(1).height = 24;

    // Date
    ws.mergeCells(2, 1, 2, ncols);
    Object.assign(ws.getCell("A2"), {
      value: `Generated: ${date}`,
      font: { italic: true, size: 9, color: { argb: "FF888888" } },
      alignment: { horizontal: "center" },
    });

    ws.addRow([]); // spacer

    // Column headers
    const hdr = ws.addRow(def.columns);
    hdr.height = 18;
    hdr.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF0D1A0D" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBBF5CF" } };
      cell.border = { bottom: { style: "medium", color: { argb: "FF0D5A0D" } } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Data
    def.rows.forEach((row, ri) => {
      const r = ws.addRow(row);
      r.height = 16;
      if (ri % 2 === 0) {
        r.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5FBF5" } };
        });
      }
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: "middle" };
      });
    });

    // Auto-width
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > max) max = len;
      });
      col.width = Math.min(max + 3, 40);
    });

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
