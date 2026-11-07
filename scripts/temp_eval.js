
    var currentEditTxReceiptDataUri = null;
    var APP_VERSION = '4.9.6';
    var APP_BUILD_ID = 202611071630;
    window.APP_VERSION = '4.9.6';
    window.APP_BUILD_ID = 202611071630;
    (function() {
      try {
        var t = localStorage.getItem('family_monefy_theme') || 'navy';
        document.documentElement.setAttribute('data-app-theme', t);
        var it = localStorage.getItem('family_monefy_icon_theme') || 'vibrant';
        document.documentElement.setAttribute('data-icon-theme', it);
        var fs = localStorage.getItem('family_expense_font_size') || 'medium';
        document.documentElement.setAttribute('data-font-size', fs);
        var cs = localStorage.getItem('family_monefy_design_style') || 'glass';
        document.documentElement.setAttribute('data-card-style', cs);
        var fk = localStorage.getItem('family_expense_app_font') || 'tajawal';
        document.documentElement.setAttribute('data-font-family', fk);
        var fontMap = {
          tajawal: "'Tajawal', -apple-system, sans-serif",
          cairo: "'Cairo', 'Tajawal', sans-serif",
          ibm: "'IBM Plex Sans Arabic', 'Tajawal', sans-serif",
          almarai: "'Almarai', 'Tajawal', sans-serif",
          readex: "'Readex Pro', 'Tajawal', sans-serif",
          alexandria: "'Alexandria', 'Tajawal', sans-serif"
        };
        if (fontMap[fk]) {
          document.documentElement.style.setProperty('--font-family', fontMap[fk], 'important');
          document.documentElement.style.setProperty('--font-numbers', fontMap[fk], 'important');
        }
      } catch(e) {}
    })();
  