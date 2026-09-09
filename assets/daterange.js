/* Staylax date-range picker.
   One field, one calendar: the first click sets check-in, the second sets
   check-out. No dependencies. Enhances <div class="daterange"> in place. */
(function () {
  'use strict';

  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function sameDay(a, b) { return !!a && !!b && a.getTime() === b.getTime(); }
  function iso(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function pretty(d) { return MONTH_SHORT[d.getMonth()] + ' ' + d.getDate(); }
  function nightsBetween(a, b) { return Math.round((b - a) / 86400000); }

  function build(root) {
    var today = startOfDay(new Date());
    var minNights = parseInt(root.getAttribute('data-min-nights'), 10) || 1;
    var label = root.getAttribute('data-label') || 'Dates';

    var state = { start: null, end: null, hover: null, view: new Date(today.getFullYear(), today.getMonth(), 1), open: false };

    root.innerHTML = '';
    root.classList.add('daterange');

    var lab = document.createElement('label');
    lab.textContent = label;
    root.appendChild(lab);

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'dr-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    root.appendChild(trigger);

    var inIn = document.createElement('input');
    inIn.type = 'hidden'; inIn.name = 'checkin';
    var inOut = document.createElement('input');
    inOut.type = 'hidden'; inOut.name = 'checkout';
    root.appendChild(inIn); root.appendChild(inOut);

    var pop = document.createElement('div');
    pop.className = 'dr-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'false');
    pop.setAttribute('aria-label', 'Choose your dates');
    pop.hidden = true;
    root.appendChild(pop);

    /* ---------- rendering ---------- */

    function renderTrigger() {
      var txt;
      if (state.start && state.end) {
        txt = '<span class="dr-range">' + pretty(state.start) + ' &ndash; ' + pretty(state.end) +
          '</span><span class="dr-nights">' + nightsBetween(state.start, state.end) +
          (nightsBetween(state.start, state.end) === 1 ? ' night' : ' nights') + '</span>';
      } else if (state.start) {
        txt = '<span class="dr-range">' + pretty(state.start) +
          '</span><span class="dr-nights">Pick a check-out date</span>';
      } else {
        txt = '<span class="dr-placeholder">Add your dates</span>';
      }
      trigger.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v3M16 2.5v3"/></svg>' +
        '<span class="dr-text">' + txt + '</span>';
      inIn.value = state.start ? iso(state.start) : '';
      inOut.value = state.end ? iso(state.end) : '';
    }

    function dayClass(d) {
      var c = ['dr-day'];
      if (d < today) c.push('is-past');
      var lo = state.start;
      var hi = state.end || (state.start && state.hover && state.hover > state.start ? state.hover : null);
      if (sameDay(d, lo)) c.push('is-start');
      if (sameDay(d, state.end)) c.push('is-end');
      if (lo && hi && d > lo && d < hi) c.push('is-between');
      if (lo && hi && !state.end && (sameDay(d, hi))) c.push('is-end is-preview');
      if (sameDay(d, today)) c.push('is-today');
      return c.join(' ');
    }

    function renderMonth(first) {
      var y = first.getFullYear(), m = first.getMonth();
      var lead = new Date(y, m, 1).getDay();
      var days = new Date(y, m + 1, 0).getDate();
      var h = '<div class="dr-month"><div class="dr-month-name">' + MONTH[m] + ' ' + y + '</div>';
      h += '<div class="dr-dow">' + DOW.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
      h += '<div class="dr-grid">';
      for (var i = 0; i < lead; i++) h += '<span class="dr-pad"></span>';
      for (var day = 1; day <= days; day++) {
        var d = new Date(y, m, day);
        var past = d < today;
        h += '<button type="button" class="' + dayClass(d) + '" data-d="' + iso(d) + '"' +
          (past ? ' disabled tabindex="-1"' : '') +
          ' aria-label="' + MONTH[m] + ' ' + day + ', ' + y + '">' +
          '<span>' + day + '</span></button>';
      }
      h += '</div></div>';
      return h;
    }

    function renderPop() {
      var two = window.matchMedia('(min-width: 700px)').matches;
      var atMin = state.view.getFullYear() === today.getFullYear() && state.view.getMonth() === today.getMonth();
      var h = '<div class="dr-head">' +
        '<button type="button" class="dr-nav" data-nav="-1" aria-label="Previous month"' + (atMin ? ' disabled' : '') + '>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<p class="dr-hint">' + (state.start && !state.end ? 'Now pick your check-out date' : 'Pick your check-in date') + '</p>' +
        '<button type="button" class="dr-nav" data-nav="1" aria-label="Next month">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '</div><div class="dr-months">' + renderMonth(state.view);
      if (two) h += renderMonth(addMonths(state.view, 1));
      h += '</div><div class="dr-foot">' +
        '<button type="button" class="dr-clear">Clear dates</button>' +
        '<button type="button" class="dr-done">' + (state.start && state.end ? 'Done' : 'Close') + '</button>' +
        '</div>';
      pop.innerHTML = h;
    }

    function render() { renderTrigger(); if (state.open) renderPop(); }

    /* ---------- open / close ---------- */

    function open() {
      if (state.open) return;
      state.open = true;
      if (state.start) state.view = new Date(state.start.getFullYear(), state.start.getMonth(), 1);
      pop.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      renderPop();
      place();
      requestAnimationFrame(function () { pop.classList.add('is-in'); });
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
    }
    function close() {
      if (!state.open) return;
      state.open = false;
      state.hover = null;
      pop.classList.remove('is-in');
      pop.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
      renderTrigger();
    }
    // The calendar is much wider than the booking card, so anchor it to
    // whichever edge keeps it on screen.
    function place() {
      if (!window.matchMedia('(min-width: 700px)').matches) { pop.style.left = pop.style.right = ''; return; }
      pop.style.left = '0'; pop.style.right = 'auto';
      var r = pop.getBoundingClientRect();
      if (r.right > window.innerWidth - 12) { pop.style.left = 'auto'; pop.style.right = '0'; }
    }

    function onOutside(e) { if (!root.contains(e.target)) close(); }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); trigger.focus(); }
    }

    /* ---------- selection ---------- */

    function pick(d) {
      if (!state.start || state.end) {
        state.start = d; state.end = null;
      } else if (d <= state.start || nightsBetween(state.start, d) < minNights) {
        // Clicking on or before check-in restarts the range rather than
        // producing an invalid or too-short stay.
        state.start = d; state.end = null;
      } else {
        state.end = d;
      }
      state.hover = null;
      render();
      if (state.start && state.end) {
        setTimeout(function () { if (state.open) close(); }, 220);
      }
    }

    trigger.addEventListener('click', function () { state.open ? close() : open(); });

    pop.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) { state.view = addMonths(state.view, parseInt(nav.getAttribute('data-nav'), 10)); renderPop(); return; }
      if (e.target.closest('.dr-clear')) { state.start = state.end = state.hover = null; render(); return; }
      if (e.target.closest('.dr-done')) { close(); trigger.focus(); return; }
      var day = e.target.closest('.dr-day');
      if (day && !day.disabled) pick(new Date(day.getAttribute('data-d') + 'T00:00:00'));
    });

    pop.addEventListener('mouseover', function (e) {
      if (!state.start || state.end) return;
      var day = e.target.closest('.dr-day');
      if (!day || day.disabled) return;
      var d = new Date(day.getAttribute('data-d') + 'T00:00:00');
      if (sameDay(d, state.hover)) return;
      state.hover = d;
      renderPop();
    });
    pop.addEventListener('mouseleave', function () {
      if (state.hover) { state.hover = null; renderPop(); }
    });

    // Keyboard: arrows walk the grid, Enter/Space picks.
    pop.addEventListener('keydown', function (e) {
      var day = e.target.closest('.dr-day');
      if (!day) return;
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!step) return;
      e.preventDefault();
      var d = addDays(new Date(day.getAttribute('data-d') + 'T00:00:00'), step);
      if (d < today) return;
      if (d.getMonth() !== state.view.getMonth() && d < state.view) state.view = addMonths(state.view, -1);
      renderPop();
      var next = pop.querySelector('.dr-day[data-d="' + iso(d) + '"]');
      if (!next) { state.view = new Date(d.getFullYear(), d.getMonth(), 1); renderPop(); next = pop.querySelector('.dr-day[data-d="' + iso(d) + '"]'); }
      if (next) next.focus();
    });

    window.addEventListener('resize', function () { if (state.open) { renderPop(); place(); } });

    // Keep the form from submitting without dates.
    var form = root.closest('form');
    if (form) {
      form.addEventListener('submit', function (e) {
        if (!state.start || !state.end) {
          e.preventDefault();
          e.stopImmediatePropagation();
          root.classList.add('has-error');
          open();
          setTimeout(function () { root.classList.remove('has-error'); }, 1600);
        }
      }, true);
    }

    render();
  }

  function init() {
    document.querySelectorAll('.daterange').forEach(build);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
