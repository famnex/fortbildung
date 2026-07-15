const PDFDocument = require('pdfkit');

function generateCertificate(res, participation, training, settings) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=teilnahmeurkunde_${participation.participation_id}.pdf`);
  
  doc.pipe(res);
  
  const schoolName = settings?.school_name || 'MSO - Fortbildungssystem';
  
  // Add School Logo if configured (Base64 check)
  const logoBase64 = settings?.school_logo_base64;
  if (logoBase64 && logoBase64.includes('base64,')) {
    try {
      const logoData = logoBase64.split('base64,')[1];
      const logoBuffer = Buffer.from(logoData, 'base64');
      doc.image(logoBuffer, {
        fit: [100, 100],
        align: 'center',
        valign: 'top'
      });
      doc.moveDown(2);
    } catch (e) {
      console.error('Error rendering logo in PDF:', e);
    }
  }

  doc.fillColor('#1a365d')
     .font('Helvetica-Bold')
     .fontSize(16)
     .text(schoolName, { align: 'center' });
  
  doc.moveDown(1);
  
  doc.fillColor('#1a365d')
     .font('Helvetica-Bold')
     .fontSize(24)
     .text('Teilnahmeurkunde', { align: 'center' });
  
  doc.moveDown(2);
  
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(12)
     .text('Wir bescheinigen hiermit, dass', { align: 'center' });
     
  doc.moveDown(1);
  
  doc.fillColor('#1a365d')
     .font('Helvetica-Bold')
     .fontSize(18)
     .text(participation.user_name, { align: 'center' });
     
  doc.moveDown(1);
  
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(12)
     .text('an folgender Fortbildung teilgenommen hat:', { align: 'center' });
     
  doc.moveDown(1);
  
  doc.fillColor('#2d3748')
     .font('Helvetica-Bold')
     .fontSize(14)
     .text(training.title, { align: 'center' });
     
  doc.moveDown(2);
  
  // Dates
  if (training.dates && training.dates.length > 0) {
    const dateStrings = training.dates.map(d => {
      const date = new Date(d.start_datetime);
      return date.toLocaleDateString('de-DE');
    }).join(', ');
    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(12)
       .text(`Termine: ${dateStrings}`, { align: 'center' });
    doc.moveDown(0.5);
  }
  
  doc.text(`Ort: ${training.location}`, { align: 'center' });
  
  doc.moveDown(3);
  
  const confirmedDate = new Date(participation.confirmed_at);
  doc.text(`Ausgestellt am: ${confirmedDate.toLocaleDateString('de-DE')}`, { align: 'center' });
  
  doc.end();
}

function generateParticipantList(res, registrations, training, settings, selectedFieldIds) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=teilnehmerliste_${training.training_id}.pdf`);
  
  doc.pipe(res);
  
  const schoolName = settings?.school_name || 'MSO - Fortbildungssystem';
  
  // Add School Logo if configured (Base64 check)
  const logoBase64 = settings?.school_logo_base64;
  if (logoBase64 && logoBase64.includes('base64,')) {
    try {
      const logoData = logoBase64.split('base64,')[1];
      const logoBuffer = Buffer.from(logoData, 'base64');
      doc.image(logoBuffer, {
        fit: [70, 70],
        align: 'center',
        valign: 'top'
      });
      doc.moveDown(1.5);
    } catch (e) {
      console.error('Error rendering logo in PDF:', e);
    }
  }

  doc.fillColor('#1a365d')
     .font('Helvetica-Bold')
     .fontSize(14)
     .text(schoolName, { align: 'center' });
  
  doc.moveDown(0.5);
  
  doc.fillColor('#1a365d')
     .font('Helvetica-Bold')
     .fontSize(18)
     .text('Teilnehmerliste', { align: 'center' });
  
  doc.moveDown(1);
  doc.fillColor('#000000')
     .font('Helvetica')
     .fontSize(11)
     .text(`Fortbildung: ${training.title}`)
     .text(`Ort: ${training.location}`)
     .text(`Anbieter: ${training.created_by_name}`);
     
  doc.moveDown(1.5);
  
  let y = doc.y;
  
  // Header
  doc.font('Helvetica-Bold')
     .text('Nr.', 50, y, { width: 30 })
     .text('Name', 85, y, { width: 140 })
     .text('E-Mail', 230, y, { width: 170 })
     .text('Anmeldedatum', 410, y, { width: 120 });
     
  doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
  y += 25;
  
  doc.font('Helvetica');
  registrations.forEach((reg, index) => {
    const regDate = new Date(reg.registered_at);
    doc.text(`${index + 1}`, 50, y, { width: 30 })
       .text(reg.user_name, 85, y, { width: 140 })
       .text(reg.user_email, 230, y, { width: 170 })
       .text(regDate.toLocaleDateString('de-DE'), 410, y, { width: 120 });
    y += 22;
    
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });
  
  doc.moveDown(2);
  doc.font('Helvetica-Bold')
     .text(`Gesamt: ${registrations.length} Teilnehmer`);
  
  doc.end();
}

module.exports = {
  generateCertificate,
  generateParticipantList
};
