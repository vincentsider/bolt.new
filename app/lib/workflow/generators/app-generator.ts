export function generateWorkflowApp(): string {
  return `// Workflow Application JavaScript
const API_URL = window.location.origin;

// Tab handling
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabId = button.getAttribute('data-tab');
    
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(\`\${tabId}-tab\`).classList.add('active');
    
    // Load data for specific tabs
    if (tabId === 'history') {
      loadSubmissionHistory();
    }
  });
});

// Form submission
const form = document.getElementById('workflow-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  
  // Disable submit button
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  
  try {
    const response = await fetch(\`\${API_URL}/api/workflow/submit\`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showNotification('success', result.message || 'Workflow submitted successfully!');
      showNotification('info', \`Your submission ID is: \${result.id}\`);
      form.reset();
      
      // Switch to status tab and show the submission
      document.querySelector('[data-tab="status"]').click();
      document.getElementById('submission-id').value = result.id;
      checkStatus();
    } else {
      if (result.errors) {
        showNotification('error', 'Please fix the following errors:\\n' + result.errors.join('\\n'));
      } else {
        showNotification('error', result.error || 'Submission failed');
      }
    }
  } catch (error) {
    showNotification('error', 'Network error. Please try again.');
    console.error('Submission error:', error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Workflow';
  }
});

// Check submission status
async function checkStatus() {
  const submissionId = document.getElementById('submission-id').value;
  const resultDiv = document.getElementById('status-result');
  
  if (!submissionId) {
    resultDiv.innerHTML = '<p class="error">Please enter a submission ID</p>';
    return;
  }
  
  try {
    resultDiv.innerHTML = '<p>Loading...</p>';
    
    const response = await fetch(\`\${API_URL}/api/workflow/\${submissionId}\`);
    const submission = await response.json();
    
    if (response.ok) {
      resultDiv.innerHTML = \`
        <div class="submission-item">
          <h3>Submission #\${submission.id}</h3>
          <p><strong>Status:</strong> <span class="status-badge \${submission.status}">\${submission.status}</span></p>
          <p><strong>Submitted:</strong> \${new Date(submission.created_at).toLocaleString()}</p>
          \${submission.approved_at ? \`<p><strong>Approved:</strong> \${new Date(submission.approved_at).toLocaleString()}</p>\` : ''}
          \${submission.approval_comments ? \`<p><strong>Comments:</strong> \${submission.approval_comments}</p>\` : ''}
          <h4>Submitted Data:</h4>
          <pre>\${JSON.stringify(submission, null, 2)}</pre>
        </div>
      \`;
    } else {
      resultDiv.innerHTML = '<p class="error">Submission not found</p>';
    }
  } catch (error) {
    resultDiv.innerHTML = '<p class="error">Error loading submission</p>';
    console.error('Status check error:', error);
  }
}

// Load submission history
async function loadSubmissionHistory() {
  const listDiv = document.getElementById('submissions-list');
  
  try {
    listDiv.innerHTML = '<p>Loading submissions...</p>';
    
    const response = await fetch(\`\${API_URL}/api/submissions\`);
    const submissions = await response.json();
    
    if (response.ok && submissions.length > 0) {
      listDiv.innerHTML = submissions.map(sub => \`
        <div class="submission-item">
          <h3>Submission #\${sub.id}</h3>
          <p><strong>Status:</strong> <span class="status-badge \${sub.status}">\${sub.status}</span></p>
          <p><strong>Submitted:</strong> \${new Date(sub.created_at).toLocaleString()}</p>
          <button onclick="document.getElementById('submission-id').value='\${sub.id}';document.querySelector('[data-tab=\\"status\\"]').click();checkStatus();" class="btn btn-primary">
            View Details
          </button>
        </div>
      \`).join('');
    } else {
      listDiv.innerHTML = '<p>No submissions found</p>';
    }
  } catch (error) {
    listDiv.innerHTML = '<p class="error">Error loading submissions</p>';
    console.error('History load error:', error);
  }
}

// Show notifications
function showNotification(type, message) {
  const notification = document.getElementById('notification');
  notification.className = \`notification \${type} show\`;
  notification.textContent = message;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

// File input preview
document.querySelectorAll('input[type="file"]').forEach(input => {
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const names = files.map(f => f.name).join(', ');
      const label = input.parentElement.querySelector('label');
      if (label) {
        const originalText = label.textContent.replace(/ \\(.*\\)/, '');
        label.textContent = \`\${originalText} (\${names})\`;
      }
    }
  });
});

// Form validation enhancements
form.addEventListener('input', (e) => {
  if (e.target.hasAttribute('required') && e.target.value) {
    e.target.classList.remove('error');
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check if we have a submission ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get('id');
  if (submissionId) {
    document.getElementById('submission-id').value = submissionId;
    document.querySelector('[data-tab="status"]').click();
    checkStatus();
  }
});`;
}