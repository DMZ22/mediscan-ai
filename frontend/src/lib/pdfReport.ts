/**
 * PDF Report Generator for MediScan AI
 * Generates a clinical assessment report using jsPDF
 * 
 * Install: npm install jspdf --legacy-peer-deps
 */

export const generateAssessmentPDF = async (assessment: any, patient: any) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const riskColors: Record<string, [number, number, number]> = {
    low: [0, 255, 136],
    medium: [255, 184, 0],
    high: [255, 71, 87],
    critical: [157, 78, 221],
  };

  const level = assessment.risk_level?.toLowerCase() || 'low';
  const color = riskColors[level] || [0, 212, 255];
  const riskPct = Math.round((assessment.risk_score || 0) * 100 * 10) / 10;
  const confidence = Math.round((assessment.model_confidence || 0) * 100);

  // ── HEADER ──
  doc.setFillColor(2, 11, 24);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MediScan AI', 15, 18);

  doc.setTextColor(180, 200, 220);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Clinical Diabetes Risk Assessment Report', 15, 26);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 33);

  // Report ID top right
  doc.setTextColor(100, 120, 140);
  doc.setFontSize(8);
  doc.text(`Report #${assessment.id || 'N/A'}`, 195, 15, { align: 'right' });

  // ── PATIENT INFO ──
  doc.setFillColor(6, 20, 40);
  doc.rect(0, 40, 210, 35, 'F');

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT INFORMATION', 15, 52);

  doc.setTextColor(200, 215, 230);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const patientInfo = [
    [`Name: ${patient.first_name || ''} ${patient.last_name || ''}`, `Age: ${patient.age || 'N/A'}`],
    [`Gender: ${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}`, `Blood Group: ${patient.blood_group || 'N/A'}`],
    [`Contact: ${patient.contact || 'N/A'}`, `Date: ${assessment.assessed_at ? new Date(assessment.assessed_at).toLocaleDateString() : 'N/A'}`],
  ];

  patientInfo.forEach((row, i) => {
    doc.text(row[0], 15, 60 + i * 6);
    doc.text(row[1], 110, 60 + i * 6);
  });

  // ── RISK SCORE BOX ──
  doc.setFillColor(...color);
  doc.roundedRect(15, 82, 80, 35, 3, 3, 'F');

  doc.setTextColor(2, 11, 24);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`${riskPct}%`, 55, 103, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`${level.toUpperCase()} RISK`, 55, 112, { align: 'center' });

  // Confidence box
  doc.setFillColor(6, 20, 40);
  doc.roundedRect(105, 82, 90, 35, 3, 3, 'F');
  doc.setTextColor(180, 200, 220);
  doc.setFontSize(9);
  doc.text('Model Confidence', 150, 94, { align: 'center' });
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${confidence}%`, 150, 108, { align: 'center' });

  // ── RISK FACTORS ──
  let y = 130;
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RISK FACTORS', 15, y);

  y += 8;
  const factors = assessment.risk_factors || [];
  if (factors.length === 0) {
    doc.setTextColor(100, 120, 140);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No significant risk factors detected', 15, y);
    y += 8;
  } else {
    factors.forEach((f: any) => {
      const statusColor: Record<string, [number, number, number]> = {
        critical: [157, 78, 221],
        high: [255, 71, 87],
        elevated: [255, 184, 0],
      };
      const sc = statusColor[f.status?.toLowerCase()] || [0, 255, 136];

      doc.setFillColor(...sc);
      doc.circle(18, y - 2, 1.5, 'F');

      doc.setTextColor(200, 215, 230);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(f.factor || '', 22, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 160, 180);
      doc.text(`${f.value || ''} · ${f.status || ''}`, 22, y + 5);

      if (f.note) {
        doc.setFontSize(8);
        doc.setTextColor(100, 120, 140);
        doc.text(f.note, 22, y + 10);
        y += 16;
      } else {
        y += 12;
      }

      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });
  }

  // ── ENSEMBLE ANALYSIS ──
  if (y > 220) { doc.addPage(); y = 20; }

  y += 5;
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ENSEMBLE MODEL ANALYSIS', 15, y);
  y += 8;

  const breakdown = assessment.model_breakdown || {};
  Object.entries(breakdown).forEach(([model, score]: [string, any]) => {
    const pct = Math.round(Number(score) * 100 * 10) / 10;

    doc.setTextColor(180, 200, 220);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(model.toUpperCase(), 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pct}%`, 195, y, { align: 'right' });

    // Bar background
    doc.setFillColor(20, 35, 55);
    doc.roundedRect(45, y - 4, 130, 5, 1, 1, 'F');

    // Bar fill
    doc.setFillColor(...color);
    doc.roundedRect(45, y - 4, Math.min(pct / 100 * 130, 130), 5, 1, 1, 'F');

    y += 10;
  });

  // ── RECOMMENDATIONS ──
  if (y > 220) { doc.addPage(); y = 20; }

  y += 5;
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CLINICAL RECOMMENDATIONS', 15, y);
  y += 8;

  doc.setFillColor(6, 20, 40);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.rect(15, y, 3, 25, 'F');

  doc.setTextColor(180, 200, 220);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const recLines = doc.splitTextToSize(assessment.recommendations || 'No recommendations available.', 170);
  doc.text(recLines, 22, y + 6);
  y += recLines.length * 5 + 15;

  // ── FOOTER ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(2, 11, 24);
    doc.rect(0, 285, 210, 15, 'F');
    doc.setTextColor(60, 80, 100);
    doc.setFontSize(7);
    doc.text('MediScan AI · Clinical Intelligence Platform · Confidential Medical Document', 105, 292, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, 195, 292, { align: 'right' });
  }

  // Save
  const filename = `MediScan_${patient.last_name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
};
