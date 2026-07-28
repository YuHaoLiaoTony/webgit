    // State
    let state = {
      status: null,
      branches: null,
      commits: null,
      remotes: null,
      selectedFiles: new Set(),
      currentView: 'status',
      csrfToken: null
    };

    // DOM Elements
    const elements = {
      themeToggle: document.getElementById('themeToggle'),
      menuToggle: document.getElementById('menuToggle'),
      mainNav: document.getElementById('mainNav'),
      branchSelector: document.getElementById('branchSelector'),
      currentBranch: document.getElementById('currentBranch'),
      syncInfo: document.getElementById('syncInfo'),
      statusContent: document.getElementById('statusContent'),
      commitList: document.getElementById('commitList'),
      branchList: document.getElementById('branchList'),
      remotesContent: document.getElementById('remotesContent'),
      branchModal: document.getElementById('branchModal'),
      branchModalTitle: document.getElementById('branchModalTitle'),
      branchModalContent: document.getElementById('branchModalContent'),
      closeBranchModal: document.getElementById('closeBranchModal'),
      confirmModal: document.getElementById('confirmModal'),
      confirmModalTitle: document.getElementById('confirmModalTitle'),
      confirmMessage: document.getElementById('confirmMessage'),
      confirmCancel: document.getElementById('confirmCancel'),
      confirmOk: document.getElementById('confirmOk'),
      closeConfirmModal: document.getElementById('closeConfirmModal'),
      toastContainer: document.getElementById('toastContainer'),
      changesBadge: document.getElementById('changesBadge'),
      newBranchBtn: document.getElementById('newBranchBtn'),
      backToHistory: document.getElementById('backToHistory'),
      commitDetailContent: document.getElementById('commitDetailContent')
    };
