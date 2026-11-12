function createReportControl(targetType, targetId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'report-box';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'link-danger';
  toggle.textContent = 'Report';

  const form = document.createElement('div');
  form.className = 'report-form';
  form.hidden = true;

  const select = document.createElement('select');
  [
    ['spam', 'Spam or advertising'],
    ['harassment', 'Harassment or hate'],
    ['privacy', 'Privacy violation'],
    ['illegal', 'Illegal content'],
    ['self_harm', 'Self-harm or suicide concern'],
    ['other', 'Other'],
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  });

  const details = document.createElement('textarea');
  details.rows = 2;
  details.maxLength = 500;
  details.placeholder = 'Details (optional)';

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = 'Send report';

  const message = document.createElement('p');
  message.className = 'form-message';

  toggle.addEventListener('click', () => {
    form.hidden = !form.hidden;
  });

  submit.addEventListener('click', async () => {
    submit.disabled = true;
    message.className = 'form-message';
    message.textContent = '';

          const row = {
      target_type: targetType,
      reason: select.value,
      details: details.value.trim() || null,
    };
    if (targetType === 'profile') {
      row.target_user = targetId;
    } else {
      row.target_id = targetId;
    }

    const { error } = await db.from('reports').insert(row);

    submit.disabled = false;

    if (error) {
      if (error.code === '23505') {
        message.textContent = 'You have already reported this.';
      } else if (error.message.includes('Too many')) {
        message.textContent = error.message;
      } else {
        message.textContent = 'Failed to send the report.';
      }
      return;
    }

     message.className = 'form-message ok';
    message.textContent = 'Thank you. We will review it.';

    if (select.value === 'self_harm') {
      message.append(' If someone may be in immediate danger, contact local emergency services now. ');
      const helpLink = document.createElement('a');
      helpLink.href = 'help.html';
      helpLink.textContent = 'See Help.';
      message.append(helpLink);
    }

    details.value = '';
  });                                              

  form.append(select, details, submit, message);
  wrapper.append(toggle, form);
  return wrapper;
}