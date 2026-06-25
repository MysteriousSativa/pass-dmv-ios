/* ===== Native bridge for the iOS (Capacitor) build =====
   Runs ONLY inside the native app. On the web (passdmv.vercel.app) it does nothing,
   so the same www/ files work in both places. */
(function () {
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return;
  var P = C.Plugins || {};

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    // Service workers can serve stale cache inside a packaged app — remove them.
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          rs.forEach(function (r) { r.unregister(); });
        }).catch(function () {});
      }
    } catch (e) {}

    // Branded status bar (palmetto blue) + hide the native splash once loaded.
    try {
      if (P.StatusBar) {
        P.StatusBar.setStyle({ style: 'LIGHT' });
        if (P.StatusBar.setBackgroundColor) P.StatusBar.setBackgroundColor({ color: '#0d5a92' });
      }
    } catch (e) {}
    try { if (P.SplashScreen) setTimeout(function () { P.SplashScreen.hide(); }, 500); } catch (e) {}

    setupHaptics();
    setupDailyReminder();
  });

  // Vibrate on answers + button taps, layered on top of the existing sound engine.
  function setupHaptics() {
    if (!P.Haptics || !window.SFX) return;
    var oc = SFX.correct, ow = SFX.wrong, ot = SFX.tap, od = SFX.done;
    SFX.correct = function () { try { P.Haptics.impact({ style: 'Medium' }); } catch (e) {} return oc.apply(SFX, arguments); };
    SFX.wrong   = function () { try { P.Haptics.notification({ type: 'Warning' }); } catch (e) {} return ow.apply(SFX, arguments); };
    SFX.tap     = function () { try { P.Haptics.impact({ style: 'Light' }); } catch (e) {} return ot.apply(SFX, arguments); };
    SFX.done    = function () { try { P.Haptics.notification({ type: 'Success' }); } catch (e) {} return od.apply(SFX, arguments); };
  }

  // Native local notification: a daily nudge at 6pm to keep the streak going.
  function setupDailyReminder() {
    if (!P.LocalNotifications) return;
    var L = (window.APP && APP.lang) || 'en';
    var msg = {
      en: { t: 'Pass DMV', b: 'Time to practice! A few questions today keeps your streak alive. 🚗' },
      es: { t: 'Pass DMV', b: '¡Hora de practicar! Unas preguntas hoy mantienen tu racha. 🚗' },
      zh: { t: 'Pass DMV', b: '该练习了！今天做几道题，保持你的连胜。🚗' }
    }[L] || { t: 'Pass DMV', b: 'Time to practice! A few questions today keeps your streak alive. 🚗' };
    try {
      P.LocalNotifications.requestPermissions().then(function (r) {
        if (!r || r.display !== 'granted') return;
        P.LocalNotifications.schedule({
          notifications: [{
            id: 1001,
            title: msg.t,
            body: msg.b,
            schedule: { on: { hour: 18, minute: 0 }, repeats: true, allowWhileIdle: true }
          }]
        }).catch(function () {});
      }).catch(function () {});
    } catch (e) {}
  }
})();
