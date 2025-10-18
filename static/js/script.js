// File upload handling
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    initializeOTPInput();
    initializeCountdown();
});

// File upload functionality
function initializeFileUpload() {
    const fileInput = document.getElementById('user_file');
    const fileLabel = document.querySelector('.file-label');
    const fileText = document.querySelector('.file-text');

    if (!fileInput || !fileLabel || !fileText) return;

    // Update label when file is selected
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            fileText.textContent = `Selected: ${file.name}`;
            fileLabel.style.borderColor = '#10b981';
            fileLabel.style.backgroundColor = '#ecfdf5';
            fileLabel.style.color = '#065f46';
        } else {
            fileText.textContent = 'Choose a file to upload';
            fileLabel.style.borderColor = '#d1d5db';
            fileLabel.style.backgroundColor = '#f9fafb';
            fileLabel.style.color = '#6b7280';
        }
    });

    // Drag and drop functionality
    let dragCounter = 0;

    fileLabel.addEventListener('dragenter', function(e) {
        e.preventDefault();
        dragCounter++;
        this.style.borderColor = '#10b981';
        this.style.backgroundColor = '#ecfdf5';
        this.style.color = '#065f46';
    });

    fileLabel.addEventListener('dragover', function(e) {
        e.preventDefault();
    });

    fileLabel.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            this.style.borderColor = '#d1d5db';
            this.style.backgroundColor = '#f9fafb';
            this.style.color = '#6b7280';
        }
    });

    fileLabel.addEventListener('drop', function(e) {
        e.preventDefault();
        dragCounter = 0;
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            fileText.textContent = `Selected: ${files[0].name}`;
            this.style.borderColor = '#10b981';
            this.style.backgroundColor = '#ecfdf5';
            this.style.color = '#065f46';
        }
    });
}

// OTP input formatting
function initializeOTPInput() {
    const otpInput = document.getElementById('otp');
    if (!otpInput) return;

    otpInput.addEventListener('input', function(e) {
        // Only allow numbers
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Limit to 6 digits
        if (this.value.length > 6) {
            this.value = this.value.slice(0, 6);
        }
    });

    otpInput.addEventListener('keydown', function(e) {
        // Allow backspace, delete, tab, escape, enter
        if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true)) {
            return;
        }
        // Ensure that it's a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });

    otpInput.addEventListener('paste', function(e) {
        setTimeout(() => {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
        }, 10);
    });
}

// Countdown timer functionality
function initializeCountdown() {
    if (typeof window.fileData === 'undefined' || !window.fileData.expiryTime) {
        return;
    }

    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;

    const expiryTime = new Date(window.fileData.expiryTime).getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = expiryTime - now;

        if (distance <= 0) {
            countdownEl.innerHTML = "Expired";
            countdownEl.className = "countdown expired";
            clearInterval(interval);
            showExpiryMessage();
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        countdownEl.innerHTML = `${minutes}m ${seconds}s`;
        
        // Add warning class when less than 30 seconds
        if (distance < 30000) {
            countdownEl.className = "countdown warning";
        } else {
            countdownEl.className = "countdown";
        }
    }

    // Update immediately
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);
}

// Copy OTP to clipboard
function copyOTP(otp) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(otp).then(function() {
            showCopySuccess();
        }).catch(function(err) {
            fallbackCopyOTP(otp);
        });
    } else {
        fallbackCopyOTP(otp);
    }
}

// Fallback copy method for older browsers
function fallbackCopyOTP(otp) {
    const textArea = document.createElement('textarea');
    textArea.value = otp;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) {
        console.error('Could not copy text: ', err);
        showCopyError();
    }
    
    document.body.removeChild(textArea);
}

// Show copy success message
function showCopySuccess() {
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅';
        copyBtn.style.color = '#10b981';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.color = '';
        }, 2000);
    }

    // Show toast notification
    showToast('OTP copied to clipboard!', 'success');
}

// Show copy error message
function showCopyError() {
    showToast('Failed to copy OTP. Please copy manually.', 'error');
}

// Show expiry message
function showExpiryMessage() {
    const successMessage = document.querySelector('.success-message');
    if (successMessage) {
        successMessage.style.background = '#fef2f2';
        successMessage.style.borderColor = '#ef4444';
        successMessage.style.color = '#991b1b';
        
        const messageHeader = successMessage.querySelector('.message-header strong');
        if (messageHeader) {
            messageHeader.textContent = 'File has expired and been deleted!';
        }
        
        const messageIcon = successMessage.querySelector('.message-icon');
        if (messageIcon) {
            messageIcon.textContent = '⏰';
        }
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        zIndex: '1000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });

    // Set background color based on type
    switch (type) {
        case 'success':
            toast.style.background = '#10b981';
            break;
        case 'error':
            toast.style.background = '#ef4444';
            break;
        default:
            toast.style.background = '#3b82f6';
    }

    // Add to DOM
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Form submission handling with loading states
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.querySelector('.upload-form');
    const downloadForm = document.querySelector('.download-form');

    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            const fileInput = this.querySelector('input[type="file"]');
            
            if (!fileInput.files[0]) {
                e.preventDefault();
                showToast('Please select a file to upload.', 'error');
                return;
            }

            // Show loading state
            if (submitBtn) {
                const originalHTML = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Uploading...';
                submitBtn.disabled = true;
                
                // Reset button state if form submission fails
                setTimeout(() => {
                    if (submitBtn.disabled) {
                        submitBtn.innerHTML = originalHTML;
                        submitBtn.disabled = false;
                    }
                }, 30000); // Reset after 30 seconds
            }
        });
    }

    if (downloadForm) {
        downloadForm.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            const otpInput = this.querySelector('input[name="otp"]');
            
            if (!otpInput.value || otpInput.value.length !== 6) {
                e.preventDefault();
                showToast('Please enter a valid 6-digit OTP.', 'error');
                otpInput.focus();
                return;
            }

            // Show loading state
            if (submitBtn) {
                const originalHTML = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Downloading...';
                submitBtn.disabled = true;
                
                // Reset button state after a delay
                setTimeout(() => {
                    if (submitBtn.disabled) {
                        submitBtn.innerHTML = originalHTML;
                        submitBtn.disabled = false;
                    }
                }, 10000); // Reset after 10 seconds
            }
        });
    }
});