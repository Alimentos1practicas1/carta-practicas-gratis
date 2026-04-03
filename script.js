(function () {
  const config = window.APP_CONFIG || {};
  const { jsPDF } = window.jspdf;

  const form = document.getElementById('letterForm');
  const previewBtn = document.getElementById('previewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const statusEl = document.getElementById('status');
  const previewText = document.getElementById('previewText');
  const currentDate = document.getElementById('currentDate');
  const destinationEmailLabel = document.getElementById('destinationEmailLabel');

  destinationEmailLabel.textContent = config.destinationEmail || 'aadh1007@outlook.com';
  currentDate.value = formatHeaderDate(new Date());

  const fields = {
    destinatario: document.getElementById('destinatario'),
    cargo: document.getElementById('cargo'),
    empresa: document.getElementById('empresa'),
    empresaTipo: document.getElementById('empresaTipo'),
    tratamiento: document.getElementById('tratamiento'),
    solicitante: document.getElementById('solicitante'),
    cedula: document.getElementById('cedula'),
    meses: document.getElementById('meses'),
    fechaInicio: document.getElementById('fechaInicio'),
    fechaFin: document.getElementById('fechaFin'),
    confirmacion: document.getElementById('confirmacion'),
  };

  Object.values(fields).forEach((field) => {
    if (!field) return;
    field.addEventListener('input', updatePreview);
    field.addEventListener('change', updatePreview);
  });

  fields.fechaInicio.addEventListener('change', suggestEndDate);
  fields.meses.addEventListener('input', suggestEndDate);

  previewBtn.addEventListener('click', updatePreview);
  downloadBtn.addEventListener('click', handleDownload);
  copyBtn.addEventListener('click', handleCopy);
  form.addEventListener('submit', handleSubmit);

  updatePreview();

  function sanitize(value) {
    return String(value || '').trim();
  }

  function formatHeaderDate(date) {
    return date.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).replace(',', '').replace(/^(\d+)/, 'Quito, $1 de').replace(/ de (\d{4})$/, ' del $1');
  }

  function formatLetterDate(value) {
    if (!value) return '';
    const date = new Date(value + 'T12:00:00');
    return date.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).replace(',', ' de');
  }

  function buildCompanyName() {
    const empresa = sanitize(fields.empresa.value);
    const empresaTipo = sanitize(fields.empresaTipo.value);
    return empresa ? `${empresa} ${empresaTipo}` : '';
  }

  function suggestEndDate() {
    const start = fields.fechaInicio.value;
    const months = Number(fields.meses.value || 0);
    if (!start || !months || fields.fechaFin.value) return;

    const date = new Date(start + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return;
    date.setMonth(date.getMonth() + months);
    fields.fechaFin.value = date.toISOString().slice(0, 10);
    updatePreview();
  }

  function buildLetterText() {
    const destinatario = sanitize(fields.destinatario.value) || '________________';
    const cargo = sanitize(fields.cargo.value) || '________________';
    const empresa = buildCompanyName() || '________________';
    const tratamiento = sanitize(fields.tratamiento.value) || 'Sr.';
    const solicitante = sanitize(fields.solicitante.value) || '________________';
    const cedula = sanitize(fields.cedula.value) || '________________';
    const meses = sanitize(fields.meses.value) || '___';
    const fechaInicio = formatLetterDate(fields.fechaInicio.value) || '___ de ______ de ____';
    const fechaFin = formatLetterDate(fields.fechaFin.value) || '___ de ______ de ____';
    const signature = config.signature || {};

    return [
      formatHeaderDate(new Date()),
      '',
      destinatario,
      cargo,
      empresa,
      '',
      'Presente. -',
      '',
      '',
      'De mi consideración:',
      'Reciba un cordial saludo de parte de la Facultad de Ciencias de la Ingeniería e Industrias. Al mismo tiempo, expresamos nuestro reconocimiento por la valiosa labor que desempeña en su institución.',
      `Mediante la presente, me permito solicitar su autorización para que el/la ${tratamiento} ${solicitante}, portador(a) de la cédula de ciudadanía No. ${cedula}, estudiante de cuarto nivel de la carrera de Ingeniería en Alimentos, realice sus prácticas preprofesionales en su prestigiosa institución.`,
      `El período de prácticas tendrá una duración de ${meses} meses, desde el ${fechaInicio} hasta el ${fechaFin}, en un horario que será acordado entre la institución y el estudiante, para el desarrollo de actividades relacionadas con su formación académica y profesional.`,
      'Agradezco de antemano su atención y quedo a la espera de su respuesta.',
      'Muy cordialmente,',
      '',
      '',
      '',
      signature.name || 'Diego Arroyo',
      signature.role || 'Director de la Carrera',
      signature.unit1 || 'Alimentos',
      signature.unit2 || 'FCII-UTE',
    ].join('\n');
  }

  function createPdfDoc(text) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginLeft = 70;
    const marginTop = 60;
    const maxWidth = doc.internal.pageSize.getWidth() - marginLeft * 2;
    const maxY = doc.internal.pageSize.getHeight() - 60;
    let y = marginTop;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    text.split('\n').forEach((paragraph) => {
      if (paragraph === '') {
        y += 16;
        if (y > maxY) {
          doc.addPage();
          y = marginTop;
        }
        return;
      }

      const lines = doc.splitTextToSize(paragraph, maxWidth);
      lines.forEach((line) => {
        if (y > maxY) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(line, marginLeft, y);
        y += 18;
      });
      y += 4;
    });

    return doc;
  }

  function fileName() {
    const safeName = (sanitize(fields.solicitante.value) || 'solicitante').replace(/\s+/g, '_');
    const datePart = new Date().toISOString().slice(0, 10);
    return `Carta_Practicas_${safeName}_${datePart}.pdf`;
  }

  function updatePreview() {
    previewText.value = buildLetterText();
  }

  function setStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }

  function validateForm() {
    if (!config.publicKey || config.publicKey.includes('REEMPLAZA_AQUI')) {
      setStatus('Antes de usar la app, debes completar config.js con tu Public Key, Service ID y Template ID de EmailJS.', 'error');
      return false;
    }

    const required = [
      fields.destinatario,
      fields.cargo,
      fields.empresa,
      fields.tratamiento,
      fields.solicitante,
      fields.cedula,
      fields.meses,
      fields.fechaInicio,
      fields.fechaFin,
    ];

    const missing = required.find((input) => !sanitize(input.value));
    if (missing) {
      missing.focus();
      setStatus('Completa todos los campos obligatorios.', 'error');
      return false;
    }

    if (!fields.confirmacion.checked) {
      setStatus('Debes confirmar que la información ingresada es correcta.', 'error');
      return false;
    }

    return true;
  }

  function handleDownload() {
    updatePreview();
    if (!validateForm()) return;
    const doc = createPdfDoc(previewText.value);
    doc.save(fileName());
    setStatus('PDF generado correctamente.', 'success');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(previewText.value);
      setStatus('Texto copiado al portapapeles.', 'success');
    } catch (error) {
      setStatus('No se pudo copiar el texto.', 'error');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    updatePreview();
    if (!validateForm()) return;

    try {
      setStatus('Generando PDF y enviando correo...', 'info');
      toggleButtons(true);

      emailjs.init({ publicKey: config.publicKey });

      const params = {
        to_email: config.destinationEmail || 'aadh1007@outlook.com',
        subject: config.emailSubject || 'Firma de carta de prácticas',
        destinatario: sanitize(fields.destinatario.value),
        cargo: sanitize(fields.cargo.value),
        empresa: buildCompanyName(),
        tratamiento: sanitize(fields.tratamiento.value),
        solicitante: sanitize(fields.solicitante.value),
        cedula: sanitize(fields.cedula.value),
        meses: sanitize(fields.meses.value),
        fecha_inicio: formatLetterDate(fields.fechaInicio.value),
        fecha_fin: formatLetterDate(fields.fechaFin.value),
        carta_html: previewText.value.replace(/\n/g, '<br>'),
      };

      await emailjs.send(config.serviceId, config.templateId, params);
      setStatus('Solicitud enviada correctamente al correo configurado.', 'success');
      form.reset();
      currentDate.value = formatHeaderDate(new Date());
      updatePreview();
    } catch (error) {
      console.error(error);
      setStatus('No se pudo enviar la solicitud. Revisa config.js y la configuración de EmailJS.', 'error');
    } finally {
      toggleButtons(false);
    }
  }

  function toggleButtons(disabled) {
    [previewBtn, downloadBtn, copyBtn, document.getElementById('sendBtn')].forEach((btn) => {
      btn.disabled = disabled;
    });
  }
})();
