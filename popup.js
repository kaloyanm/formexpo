// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  // Function to analyze forms in the current page
  function analyzeForms() {
    const forms = document.getElementsByTagName('form');
    const formList = [];
    
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      formList.push({
        id: form.id || `form-${i + 1}`,
        action: form.action || 'No action specified',
        method: form.method || 'get',
        inputs: form.elements.length
      });
    }
    
    return formList;
  }

  // Function to display forms in the popup
  function displayForms(forms) {
    const container = document.getElementById('forms-container');
    
    if (forms.length === 0) {
      container.innerHTML = '<div class="no-forms">No forms found</div>';
      return;
    }
    
    const formListHTML = forms.map(form => `
      <div class="form-item">
        <strong>ID/Name:</strong> ${form.id}<br>
        <strong>Action:</strong> ${form.action}<br>
        <strong>Method:</strong> ${form.method}<br>
        <strong>Number of inputs:</strong> ${form.inputs}
      </div>
    `).join('');
    
    container.innerHTML = `<div class="form-list">${formListHTML}</div>`;
  }

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
