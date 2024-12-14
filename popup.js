// Function to analyze forms in the current page
function analyzeForms() {
  const forms = document.getElementsByTagName('form');
  const formList = [];
  
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    const elements = Array.from(form.elements).map(element => ({
      name: element.name || '',
      type: element.type || '',
      value: element.value || '',
      required: element.required || false
    }));

    formList.push({
      id: form.id || `form-${i + 1}`,
      action: form.action || 'No action specified',
      method: form.method || 'get',
      inputs: elements
    });
  }
  
  return formList;
}

// Function to export form data
function exportForm(form, format) {
  let exportData;
  
  if (format === 'json') {
    exportData = JSON.stringify(form, null, 2);
  } else if (format === 'xml') {
    exportData = `<?xml version="1.0" encoding="UTF-8"?>
<form>
  <id>${form.id}</id>
  <action>${form.action}</action>
  <method>${form.method}</method>
  <inputs>
    ${form.inputs.map(input => `
    <input>
      <name>${input.name}</name>
      <type>${input.type}</type>
      <value>${input.value}</value>
      <required>${input.required}</required>
    </input>`).join('')}
  </inputs>
</form>`;
  }

  // Create a blob and download the file
  const blob = new Blob([exportData], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `form-${form.id}-export.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to toggle dropdown
function toggleDropdown(index) {
  const dropdowns = document.querySelectorAll('.export-options');
  dropdowns.forEach((dropdown, i) => {
    if (i !== index) {
      dropdown.classList.remove('show');
    }
  });
  dropdowns[index].classList.toggle('show');
}

// Function to display forms in the popup
function displayForms(forms) {
  const container = document.getElementById('forms-container');
  
  if (forms.length === 0) {
    container.innerHTML = '<div class="no-forms">No forms found</div>';
    return;
  }
  
  const formListHTML = forms.map((form, index) => {
    return `
      <div class="form-item" data-form-index="${index}">
        <div class="export-dropdown">
          <button class="export-button" data-index="${index}">Export ▼</button>
          <div class="export-options">
            <div class="export-option" data-format="json">Export as JSON</div>
            <div class="export-option" data-format="xml">Export as XML</div>
          </div>
        </div>
        <strong>ID/Name:</strong> ${form.id}<br>
        <strong>Action:</strong> ${form.action}<br>
        <strong>Method:</strong> ${form.method}<br>
        <strong>Number of inputs:</strong> ${form.inputs.length}
      </div>
    `;
  }).join('');
  
  container.innerHTML = `<div class="form-list">${formListHTML}</div>`;

  // Add event listeners after adding the HTML
  const exportButtons = document.querySelectorAll('.export-button');
  const exportOptions = document.querySelectorAll('.export-option');

  exportButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      toggleDropdown(index);
      e.stopPropagation();
    });
  });

  exportOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const format = e.target.dataset.format;
      const formItem = e.target.closest('.form-item');
      const index = parseInt(formItem.dataset.formIndex);
      exportForm(forms[index], format);
      e.stopPropagation();
    });
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.matches('.export-button')) {
    const dropdowns = document.querySelectorAll('.export-options');
    dropdowns.forEach(dropdown => {
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    });
  }
});

// When popup loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Execute script in the current tab to analyze forms
    const [results] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: analyzeForms
    });
    
    displayForms(results.result);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('forms-container').innerHTML = 
      '<div class="no-forms">Unable to analyze forms on this page</div>';
  }
});
