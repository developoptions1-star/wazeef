// Replit Shell Buster - prevents Replit from wrapping the app
(function() {
  // Break out of iframe if embedded by Replit
  if (window.self !== window.top) {
    try {
      window.top.location = window.self.location;
    } catch(e) {
      // Fallback: hide the shell
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      if (window.frameElement) {
        window.frameElement.style.display = 'none';
      }
    }
  }
})();
