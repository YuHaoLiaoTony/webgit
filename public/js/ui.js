    // Toast notifications
    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      elements.toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // Confirmation dialog
    function confirm(title, message) {
      return new Promise((resolve) => {
        elements.confirmModalTitle.textContent = title;
        elements.confirmMessage.textContent = message;
        elements.confirmModal.classList.add('open');

        const handleConfirm = () => {
          elements.confirmModal.classList.remove('open');
          cleanup();
          resolve(true);
        };

        const handleCancel = () => {
          elements.confirmModal.classList.remove('open');
          cleanup();
          resolve(false);
        };

        const cleanup = () => {
          elements.confirmOk.removeEventListener('click', handleConfirm);
          elements.confirmCancel.removeEventListener('click', handleCancel);
          elements.closeConfirmModal.removeEventListener('click', handleCancel);
        };

        elements.confirmOk.addEventListener('click', handleConfirm);
        elements.confirmCancel.addEventListener('click', handleCancel);
        elements.closeConfirmModal.addEventListener('click', handleCancel);
      });
    }
