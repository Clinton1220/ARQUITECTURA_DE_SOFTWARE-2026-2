"""
Script para compilar el Documento de Arquitectura de Software (DAS)
en formatos oficiales Word (DAS.docx) y PDF (DAS.pdf), cumpliendo
estrictamente con las normas de formato APA 7 y la rúbrica docente.
"""

import os
import re
import html
from PIL import Image

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Preformatted
)
from reportlab.platypus import Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOCS_DIR = os.path.join(BASE_DIR, 'docs')
DAS_MD = os.path.join(DOCS_DIR, 'DAS.md')
DAS_DOCX = os.path.join(DOCS_DIR, 'DAS.docx')
DAS_PDF = os.path.join(DOCS_DIR, 'DAS.pdf')

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def apply_apa_table_borders(table):
    """Aplica el estilo APA 7 a una tabla Word: líneas horizontales superior, inferior de encabezado y final."""
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="10" w:space="0" w:color="000000"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:bottom w:val="single" w:sz="10" w:space="0" w:color="000000"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="none"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(tblBorders)
    if len(table.rows) > 0:
        for cell in table.rows[0].cells:
            tcPr = cell._tc.get_or_add_tcPr()
            tcBorders = parse_xml(
                f'<w:tcBorders {nsdecls("w")}>'
                f'  <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>'
                f'</w:tcBorders>'
            )
            tcPr.append(tcBorders)

def add_page_number_to_header(section):
    """Agrega número de página en la esquina superior derecha según norma APA 7."""
    header = section.header
    p = header.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run()
    fldChar1 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
    instrText = parse_xml(f'<w:instrText {nsdecls("w")} xml:space="preserve"> PAGE </w:instrText>')
    fldChar2 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="separate"/>')
    fldChar3 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="end"/>')
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)

def md_to_reportlab(text):
    if not text:
        return ""
    text = text.replace('<br>', '___BR___')
    text = html.escape(text, quote=False)
    text = text.replace('___BR___', '<br/>')
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'`(.+?)`', r'<b>\1</b>', text)
    text = re.sub(r'(?<![\w\*\-])\*([a-zA-ZáéíóúÁÉÍÓÚñÑ 0-9\-.,;:()]+?)\*(?![\w\*\-])', r'<i>\1</i>', text)
    text = text.replace(r'\le', '&le;').replace(r'\ge', '&ge;').replace(r'\rightarrow', '&rarr;')
    text = text.replace('$', '')
    return text

class NumberedCanvas(canvas.Canvas):
    """Canvas de ReportLab de 2 pasadas para numeración APA 7 en esquina superior derecha."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#334155"))
        # APA 7: Número en esquina superior derecha
        self.drawRightString(letter[0] - 40, letter[1] - 30, str(self._pageNumber))
        self.restoreState()


# ============================================================================
# GENERADOR DOCX (MICROSOFT WORD - APA 7)
# ============================================================================
def generar_docx():
    print("[DOCX] Generando DAS.docx con formato APA 7...")
    doc = Document()

    # Márgenes de 1 pulgada (2.54 cm) en todos los lados (APA 7)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        add_page_number_to_header(section)

    with open(DAS_MD, 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.splitlines()

    in_code_block = False
    code_lines = []
    in_table = False
    table_lines = []
    in_references = False

    def flush_docx_table(t_lines):
        if not t_lines:
            return
        rows_data = []
        for l in t_lines:
            raw = l.strip()
            if not raw.startswith('|'):
                continue
            cols = [c.strip() for c in raw.split('|')[1:-1]]
            if all(set(c).issubset({'-', ':', ' '}) for c in cols):
                continue
            rows_data.append(cols)
        if not rows_data:
            return
        cols_count = max(len(r) for r in rows_data)
        t = doc.add_table(rows=len(rows_data), cols=cols_count)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for r_idx, row in enumerate(rows_data):
            for c_idx, val in enumerate(row):
                if c_idx < cols_count:
                    cell = t.cell(r_idx, c_idx)
                    clean_val = val.replace('<br>', '\n').replace('**', '').replace('`', '').replace('&rarr;', '→')
                    p = cell.paragraphs[0]
                    p.paragraph_format.line_spacing = 1.15
                    p.paragraph_format.space_after = Pt(2)
                    r = p.add_run(clean_val)
                    r.font.name = 'Calibri'
                    r.font.size = Pt(9.5)
                    if r_idx == 0:
                        r.bold = True
        apply_apa_table_borders(t)
        doc.add_paragraph()

    def flush_docx_code(c_lines):
        if not c_lines:
            return
        code_text = "\n".join(c_lines)
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.4)
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(code_text)
        r.font.name = 'Consolas'
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(30, 41, 59)
        doc.add_paragraph()

    # Procesar línea a línea
    idx = 0
    while idx < len(lines):
        line = lines[idx]
        stripped = line.strip()

        # Manejo de bloques de código
        if stripped.startswith('```'):
            if in_code_block:
                in_code_block = False
                flush_docx_code(code_lines)
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            idx += 1
            continue

        if in_code_block:
            code_lines.append(line)
            idx += 1
            continue

        # Manejo de tablas
        if stripped.startswith('|'):
            in_table = True
            table_lines.append(line)
            idx += 1
            continue
        elif in_table:
            in_table = False
            flush_docx_table(table_lines)
            table_lines = []

        if not stripped:
            idx += 1
            continue

        # Separadores horizontales
        if stripped == '---':
            doc.add_page_break()
            idx += 1
            continue

        # Detección de Referencias (APA sangría francesa)
        if stripped == '# Referencias':
            in_references = True
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run("Referencias")
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(16)
            r.font.color.rgb = RGBColor(0, 0, 0)
            p.paragraph_format.space_after = Pt(12)
            idx += 1
            continue
        elif stripped.startswith('# ') and in_references:
            in_references = False

        # Títulos APA 7:
        # Nivel 1: Centrado y en negrita
        if stripped.startswith('# '):
            heading_text = stripped[2:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(heading_text)
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(15)
            r.font.color.rgb = RGBColor(0, 51, 102)
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(8)

        # Nivel 2: Alineado a la izquierda y en negrita
        elif stripped.startswith('## '):
            heading_text = stripped[3:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(heading_text)
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(15, 23, 42)
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(6)

        # Nivel 3: Alineado a la izquierda, en negrita y cursiva
        elif stripped.startswith('### '):
            heading_text = stripped[4:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(heading_text)
            r.bold = True
            r.italic = True
            r.font.name = 'Calibri'
            r.font.size = Pt(11.5)
            r.font.color.rgb = RGBColor(30, 41, 59)
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)

        # Nivel 4: Alineado a la izquierda, con sangría y negrita
        elif stripped.startswith('#### '):
            heading_text = stripped[5:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(heading_text)
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(10.5)
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(3)

        # Detección de Rótulos de Tablas y Figuras APA («Tabla 1» o «Figura 1» en negrita)
        elif re.match(r'^\*\*(Tabla|Figura)\s+[0-9A-Za-z]+\*\*', stripped):
            label_text = stripped.replace('**', '')
            p = doc.add_paragraph()
            r = p.add_run(label_text)
            r.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(10.5)
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)

        # Título en cursiva debajo del rótulo APA
        elif re.match(r'^\*[A-Za-zÁÉÍÓÚñÑ0-9\s()—–,\-.]+\*$', stripped) and not stripped.startswith('*Nota.*'):
            title_text = stripped[1:-1]
            p = doc.add_paragraph()
            r = p.add_run(title_text)
            r.italic = True
            r.font.name = 'Calibri'
            r.font.size = Pt(10)
            p.paragraph_format.space_after = Pt(6)

        # Nota de tabla o figura APA
        elif stripped.startswith('*Nota.*'):
            note_text = stripped.replace('*Nota.*', '').replace('*', '').strip()
            p = doc.add_paragraph()
            r_label = p.add_run("Nota. ")
            r_label.italic = True
            r_label.font.name = 'Calibri'
            r_label.font.size = Pt(8.5)
            r_content = p.add_run(note_text)
            r_content.font.name = 'Calibri'
            r_content.font.size = Pt(8.5)
            r_content.font.color.rgb = RGBColor(71, 85, 105)
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(10)

        # Inserción de Imágenes (Diagramas)
        elif stripped.startswith('![') and '](' in stripped and stripped.endswith(')'):
            m = re.match(r'!\[(.*?)\]\((.*?)\)', stripped)
            if m:
                alt_text, img_rel_path = m.group(1), m.group(2)
                img_path = os.path.normpath(os.path.join(DOCS_DIR, img_rel_path))
                if os.path.exists(img_path):
                    p_img = doc.add_paragraph()
                    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_img.paragraph_format.space_before = Pt(6)
                    p_img.paragraph_format.space_after = Pt(6)
                    doc.add_picture(img_path, width=Inches(5.8))
                    last_p = doc.paragraphs[-1]
                    last_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Citas / Bloques de texto resaltado
        elif stripped.startswith('> '):
            quote_text = stripped[2:].replace('**', '').replace('`', '')
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.4)
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(quote_text)
            r.italic = True
            r.font.name = 'Calibri'
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(51, 65, 85)

        # Listas con viñetas
        elif stripped.startswith('- ') or stripped.startswith('* '):
            list_text = stripped[2:].replace('**', '').replace('`', '')
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            if in_references:
                # Sangría francesa para referencias
                p.paragraph_format.left_indent = Inches(0.5)
                p.paragraph_format.first_line_indent = Inches(-0.5)
            r = p.add_run(list_text)
            r.font.name = 'Calibri'
            r.font.size = Pt(10)

        # Listas numeradas
        elif re.match(r'^\d+\.\s', stripped):
            num_text = re.sub(r'^\d+\.\s', '', stripped).replace('**', '').replace('`', '')
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(num_text)
            r.font.name = 'Calibri'
            r.font.size = Pt(10)

        # Párrafos regulares de texto
        else:
            clean_text = stripped.replace('**', '').replace('`', '')
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = 1.15
            if in_references:
                p.paragraph_format.left_indent = Inches(0.5)
                p.paragraph_format.first_line_indent = Inches(-0.5)
            r = p.add_run(clean_text)
            r.font.name = 'Calibri'
            r.font.size = Pt(10.5)

        idx += 1

    if in_table and table_lines:
        flush_docx_table(table_lines)
    if in_code_block and code_lines:
        flush_docx_code(code_lines)

    doc.save(DAS_DOCX)
    print(f"[DOCX] Archivo oficial guardado con éxito: {DAS_DOCX}")


# ============================================================================
# GENERADOR PDF (REPORTLAB - APA 7)
# ============================================================================
def generar_pdf():
    print("[PDF] Generando DAS.pdf con formato APA 7...")
    pdf = SimpleDocTemplate(
        DAS_PDF,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos APA 7
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#003366'),
        alignment=1,
        spaceAfter=8
    )
    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#003366'),
        alignment=1, # APA 7 Nivel 1 Centrado
        spaceBefore=14,
        spaceAfter=6
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
        alignment=0, # APA 7 Nivel 2 Izquierda
        spaceBefore=10,
        spaceAfter=4
    )
    h3_style = ParagraphStyle(
        'DocH3',
        parent=styles['Heading3'],
        fontName='Helvetica-BoldOblique',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor('#1E293B'),
        alignment=0, # APA 7 Nivel 3 Izquierda cursiva
        spaceBefore=8,
        spaceAfter=3
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=4
    )
    ref_style = ParagraphStyle(
        'DocRef',
        parent=body_style,
        leftIndent=20,
        firstLineIndent=-20,
        spaceAfter=5
    )
    quote_style = ParagraphStyle(
        'DocQuote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=15,
        spaceAfter=4
    )
    table_label_style = ParagraphStyle(
        'TableLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=6,
        spaceAfter=1
    )
    table_title_style = ParagraphStyle(
        'TableTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )
    note_style = ParagraphStyle(
        'TableNote',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#64748B'),
        spaceBefore=2,
        spaceAfter=8
    )
    table_th_style = ParagraphStyle(
        'TableTH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0F172A')
    )
    table_td_style = ParagraphStyle(
        'TableTD',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor('#1E293B')
    )
    code_style = ParagraphStyle(
        'DocCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    with open(DAS_MD, 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.splitlines()

    in_code = False
    code_lines = []
    in_table = False
    table_lines = []
    in_references = False

    def flush_pdf_table(t_lines):
        if not t_lines:
            return
        rows_data = []
        for l in t_lines:
            raw = l.strip()
            if not raw.startswith('|'):
                continue
            cols = [c.strip() for c in raw.split('|')[1:-1]]
            if all(set(c).issubset({'-', ':', ' '}) for c in cols):
                continue
            rows_data.append(cols)
        if not rows_data:
            return

        cols_count = max(len(r) for r in rows_data)
        available_width = 532
        col_width = available_width / cols_count

        table_formatted = []
        for r_idx, r in enumerate(rows_data):
            row_cells = []
            for val in r:
                formatted = md_to_reportlab(val)
                st = table_th_style if r_idx == 0 else table_td_style
                row_cells.append(Paragraph(formatted, st))
            while len(row_cells) < cols_count:
                row_cells.append(Paragraph("", table_td_style))
            table_formatted.append(row_cells)

        t_elem = Table(table_formatted, colWidths=[col_width]*cols_count)
        # APA 7: Tablas solo con líneas horizontales (superior, debajo del encabezado, y fondo)
        t_elem.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1.0, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 0.75, colors.black),
            ('LINEBELOW', (0, -1), (-1, -1), 1.0, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t_elem)
        story.append(Spacer(1, 4))

    def flush_pdf_code(c_lines):
        if not c_lines:
            return
        # Para evitar desbordamientos en PDF, tomar extracto si es demasiado largo
        max_lines = 45
        sample = c_lines[:max_lines]
        if len(c_lines) > max_lines:
            sample.append("... [código truncado para presentación ejecutiva en PDF]")
        code_text = html.escape("\n".join(sample))
        story.append(Preformatted(code_text, code_style))
        story.append(Spacer(1, 4))

    idx = 0
    while idx < len(lines):
        line = lines[idx]
        stripped = line.strip()

        if stripped.startswith('```'):
            if in_code:
                in_code = False
                flush_pdf_code(code_lines)
                code_lines = []
            else:
                in_code = True
                code_lines = []
            idx += 1
            continue

        if in_code:
            code_lines.append(line)
            idx += 1
            continue

        if stripped.startswith('|'):
            in_table = True
            table_lines.append(line)
            idx += 1
            continue
        elif in_table:
            in_table = False
            flush_pdf_table(table_lines)
            table_lines = []

        if not stripped:
            idx += 1
            continue

        if stripped == '---':
            story.append(PageBreak())
            idx += 1
            continue

        if stripped == '# Referencias':
            in_references = True
            story.append(Paragraph("Referencias", h1_style))
            story.append(Spacer(1, 6))
            idx += 1
            continue
        elif stripped.startswith('# ') and in_references:
            in_references = False

        if stripped.startswith('# '):
            story.append(Paragraph(md_to_reportlab(stripped[2:]), h1_style))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=5))
        elif stripped.startswith('## '):
            story.append(Paragraph(md_to_reportlab(stripped[3:]), h2_style))
        elif stripped.startswith('### '):
            story.append(Paragraph(md_to_reportlab(stripped[4:]), h3_style))
        elif stripped.startswith('#### '):
            story.append(Paragraph(f"<b>{md_to_reportlab(stripped[5:])}</b>", body_style))
        elif re.match(r'^\*\*(Tabla|Figura)\s+[0-9A-Za-z]+\*\*', stripped):
            story.append(Paragraph(stripped.replace('**', ''), table_label_style))
        elif re.match(r'^\*[A-Za-zÁÉÍÓÚñÑ0-9\s()—–,\-.]+\*$', stripped) and not stripped.startswith('*Nota.*'):
            story.append(Paragraph(stripped[1:-1], table_title_style))
        elif stripped.startswith('*Nota.*'):
            clean_note = stripped.replace('*Nota.*', '').replace('*', '').strip()
            story.append(Paragraph(f"<i>Nota.</i> {md_to_reportlab(clean_note)}", note_style))
        elif stripped.startswith('![') and '](' in stripped and stripped.endswith(')'):
            m = re.match(r'!\[(.*?)\]\((.*?)\)', stripped)
            if m:
                alt_text, img_rel_path = m.group(1), m.group(2)
                img_path = os.path.normpath(os.path.join(DOCS_DIR, img_rel_path))
                if os.path.exists(img_path):
                    try:
                        im = Image.open(img_path)
                        orig_w, orig_h = im.size
                        target_w = 480
                        target_h = min(320, int(orig_h * (target_w / orig_w)))
                        story.append(Spacer(1, 4))
                        story.append(RLImage(img_path, width=target_w, height=target_h))
                        story.append(Spacer(1, 4))
                    except Exception as e:
                        print(f"Aviso imagen PDF: {e}")
        elif stripped.startswith('> '):
            story.append(Paragraph(md_to_reportlab(stripped[2:]), quote_style))
        elif stripped.startswith('- ') or stripped.startswith('* '):
            formatted = md_to_reportlab(stripped[2:])
            st = ref_style if in_references else body_style
            bullet_prefix = "" if in_references else "• "
            story.append(Paragraph(f"{bullet_prefix}{formatted}", st))
        elif re.match(r'^\d+\.\s', stripped):
            formatted = md_to_reportlab(stripped)
            story.append(Paragraph(formatted, body_style))
        else:
            formatted = md_to_reportlab(stripped)
            st = ref_style if in_references else body_style
            story.append(Paragraph(formatted, st))

        idx += 1

    if in_table and table_lines:
        flush_pdf_table(table_lines)
    if in_code and code_lines:
        flush_pdf_code(code_lines)

    pdf.build(story, canvasmaker=NumberedCanvas)
    print(f"[PDF] Archivo oficial guardado con éxito: {DAS_PDF}")

if __name__ == '__main__':
    generar_docx()
    generar_pdf()
