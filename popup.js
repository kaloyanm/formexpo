// Helper function for logging
function log(message, data = null, type = 'LOG') {
  const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.log(`FormExpo Extension (popup): ${logMessage}`);
  chrome.runtime.sendMessage({ type, data: logMessage });
}

// Helper function for error logging
function logError(message, error = null) {
  const errorMessage = error ? `${message} ${error.toString()}` : message;
  console.error(`FormExpo Extension (popup): ${errorMessage}`);
  chrome.runtime.sendMessage({ type: 'ERROR', data: errorMessage });
}

// Function to analyze forms in the current page
function analyzeForms() {
  const forms = document.getElementsByTagName('form');
  const formList = [];
  
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    const elements = Array.from(form.elements).map((element, index) => ({
      id: element.id || '',
      name: element.name || '',
      type: element.type || '',
      value: element.value || '',
      required: element.required || false,
      index: index
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

// Function to safely parse XML
function parseXMLSafely(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Check for XML parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('XML parsing error: ' + parserError.textContent);
  }
  
  return {
    id: xmlDoc.querySelector('id')?.textContent || '',
    action: xmlDoc.querySelector('action')?.textContent || '',
    method: xmlDoc.querySelector('method')?.textContent || '',
    inputs: Array.from(xmlDoc.querySelectorAll('input')).map(input => ({
      id: input.querySelector('id')?.textContent || '',
      name: input.querySelector('name')?.textContent || '',
      type: input.querySelector('type')?.textContent || '',
      value: input.querySelector('value')?.textContent || '',
      required: input.querySelector('required')?.textContent === 'true'
    }))
  };
}

// Function to inject and fill form
async function injectAndFillForm(formIndex, formData) {
  log('Starting injectAndFillForm...', { formIndex, formData });
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    log('Found active tab:', { tabId: tab.id });

    // First inject the fill form function
    log('Injecting fillForm function...');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (fIndex, fData) => {
        // These logs will appear in the web page's console
        const logger = {
          log: (...args) => console.log('%c FormExpo Extension: ', 'background: #222; color: #bada55', ...args),
          error: (...args) => console.error('%c FormExpo Extension: ', 'background: #222; color: #bada55', ...args),
          warn: (...args) => console.warn('%c FormExpo Extension: ', 'background: #222; color: #bada55', ...args)
        };

        logger.log('Inside injected script', { fIndex, fData });
        
        const forms = document.getElementsByTagName('form');
        logger.log('Found forms:', forms.length);
        
        const form = forms[fIndex];
        if (!form) {
          logger.error('Form not found at index:', fIndex);
          return;
        }
        
        logger.log('Processing form:', form.id || `form-${fIndex}`);
        
        fData.inputs.forEach((inputData, index) => {
          logger.log('Processing input:', inputData);
          
          let element = null;
          
          // Try by ID
          if (inputData.id) {
            element = document.getElementById(inputData.id);
            logger.log('ID match attempt:', inputData.id, !!element);
          }
          
          // Try by name
          if (!element && inputData.name) {
            element = form.querySelector(`[name="${inputData.name}"]`);
            logger.log('Name match attempt:', inputData.name, !!element);
          }
          
          // Try by type and index
          if (!element) {
            const inputs = Array.from(form.elements);
            element = inputs.find(el => el.type === inputData.type && inputs.indexOf(el) === index);
            logger.log('Type/Index match attempt:', inputData.type, index, !!element);
          }
          
          if (element) {
            logger.log('Setting value for:', element.name || element.id, 'to:', inputData.value);
            
            try {
              // Set the value
              if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = inputData.value === 'true';
              } else {
                element.value = inputData.value;
              }
              
              // Trigger events
              ['input', 'change'].forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                element.dispatchEvent(event);
              });
              
              logger.log('Successfully set value and triggered events');
            } catch (error) {
              logger.error('Error setting value:', error);
            }
          } else {
            logger.warn('No matching element found for input:', inputData);
          }
        });
        
        logger.log('Form fill complete');
      },
      args: [formIndex, formData]
    });
    
    log('Script injection complete');
  } catch (error) {
    logError('Error in injectAndFillForm:', error);
    throw error;
  }
}

// Function to handle file import
function handleFileImport(formIndex) {
  log('Starting file import for form index:', { formIndex });
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.xml';
  
  // Create a promise to handle the file reading
  const fileReadingPromise = new Promise((resolve, reject) => {
    log('Setting up file input event listeners');
    
    input.onchange = function(event) {
      log('File input change event triggered');
      
      const file = event.target.files[0];
      if (!file) {
        const error = new Error('No file selected');
        logError(error.message);
        reject(error);
        return;
      }
      
      log('File selected:', { 
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      const reader = new FileReader();
      
      // Debug: Log all reader events
      ['loadstart', 'progress', 'load', 'error', 'abort'].forEach(eventType => {
        reader.addEventListener(eventType, (e) => {
          log(`FileReader ${eventType} event:`, { 
            event: eventType,
            loaded: e.loaded,
            total: e.total
          });
        });
      });
      
      reader.onloadend = function(e) {
        log('FileReader loadend event triggered');
        
        if (reader.error) {
          const error = new Error('Error reading file: ' + reader.error);
          logError(error.message);
          reject(error);
          return;
        }
        
        try {
          let formData;
          const content = reader.result;
          log('File content read successfully, length:', content.length);
          
          if (file.name.endsWith('.json')) {
            log('Parsing JSON file');
            try {
              formData = JSON.parse(content);
            } catch (jsonError) {
              throw new Error('Invalid JSON format: ' + jsonError.message);
            }
          } else if (file.name.endsWith('.xml')) {
            log('Parsing XML file');
            formData = parseXMLSafely(content);
          } else {
            throw new Error('Unsupported file format. Please use .json or .xml files.');
          }
          
          log('Successfully parsed form data');
          
          // Validate the parsed data structure
          if (!formData || !Array.isArray(formData.inputs)) {
            throw new Error('Invalid form data structure');
          }
          
          resolve(formData);
        } catch (error) {
          logError('Error processing file content:', error);
          alert('Error importing form data: ' + error.message);
          reject(error);
        }
      };
      
      // Start reading the file
      log('Starting to read file as text');
      try {
        reader.readAsText(file);
        log('ReadAsText called successfully');
      } catch (error) {
        logError('Error calling readAsText:', error);
        reject(error);
      }
    };
    
    // Handle potential errors on the input element
    input.onerror = function(error) {
      logError('Error with file input:', error);
      reject(error);
    };
  });
  
  // Trigger file selection
  log('Triggering file input click');
  input.click();
  
  // Handle the promise
  fileReadingPromise.then(async formData => {
    log('File reading promise resolved, injecting form data');
    await injectAndFillForm(formIndex, formData);
  }).catch(error => {
    logError('File reading promise rejected:', error);
  });
  
  return fileReadingPromise;
}

// Function to export form data
function exportForm(form, format) {
  log('Exporting form data in format:', { format });
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
      <id>${input.id}</id>
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
function toggleDropdown(index, type) {
  const dropdowns = document.querySelectorAll(`.${type}-options`);
  dropdowns.forEach((dropdown, i) => {
    if (i !== index) {
      dropdown.classList.remove('show');
    }
  });
  dropdowns[index].classList.toggle('show');
}

// Function to display forms in the popup
function displayForms(forms) {
  log('Displaying forms in popup');
  const container = document.getElementById('forms-container');
  
  if (forms.length === 0) {
    container.innerHTML = '<div class="no-forms">No forms found</div>';
    return;
  }
  
  const formListHTML = forms.map((form, index) => {
    return `
      <div class="form-item" data-form-index="${index}">
        <div class="button-group">
          <div class="export-dropdown">
            <button class="export-button" data-index="${index}">Export ▼</button>
            <div class="export-options">
              <div class="export-option" data-format="json">Export as JSON</div>
              <div class="export-option" data-format="xml">Export as XML</div>
            </div>
          </div>
          <button class="import-button" data-index="${index}">Import</button>
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
  const importButtons = document.querySelectorAll('.import-button');

  exportButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      toggleDropdown(index, 'export');
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

  importButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      handleFileImport(index);
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
    log('Popup loaded');
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    log('Found active tab:', { tabId: tab.id });
    
    // Execute script in the current tab to analyze forms
    const [results] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: analyzeForms
    });
    
    log('Forms analyzed:', { forms: results.result });
    displayForms(results.result);
  } catch (error) {
    logError('Error:', error);
    document.getElementById('forms-container').innerHTML = 
      '<div class="no-forms">Unable to analyze forms on this page</div>';
  }
});
