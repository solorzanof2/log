Date.prototype.addDays = function(n) {
  const d = new Date(this.valueOf());
  d.setDate(d.getDate() + n);
  return d;
};

const days = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

Log.data = {

  /**
   * Parse log data
   * @param {Object[]} [entries] - Entries
   * @returns {Object[]} Parsed entries
   */
  parse(entries = Log.log) {
    if (typeof entries !== 'object' || entries.length === 0) return;
    if (typeof entries[0] !== 'object') return;

    const parsed = [];

    for (let i = 0, l = entries.length; i < l; i++) {
      let sc = user.palette[entries[i].c] || Log.config.ui.colour;
      let pc = user.projectPalette[entries[i].t] || Log.config.ui.colour;

      if (
        Log.time.date(entries[i].s) !== Log.time.date(entries[i].e) &&
        entries[i].e !== undefined
      ) {
        const a = Log.time.convert(entries[i].s);
        const b = Log.time.convert(entries[i].e);

        const e = Log.time.toHex(
          new Date(a.getFullYear(), a.getMonth(), a.getDate(), 23, 59, 59)
        );

        const s = Log.time.toHex(
          new Date(b.getFullYear(), b.getMonth(), b.getDate(), 0, 0, 0)
        );

        parsed[parsed.length] = {
          e, sc, pc,
          id: i,
          s: entries[i].s,
          c: entries[i].c,
          t: entries[i].t,
          d: entries[i].d,
          dur: Log.time.duration(entries[i].s, e)
        };

        parsed[parsed.length] = {
          s, sc, pc,
          id: i,
          e: entries[i].e,
          c: entries[i].c,
          t: entries[i].t,
          d: entries[i].d,
          dur: Log.time.duration(s, entries[i].e)
        };
      } else {
        parsed[parsed.length] = {
          sc, pc,
          id: i,
          s: entries[i].s,
          e: entries[i].e,
          c: entries[i].c,
          t: entries[i].t,
          d: entries[i].d,
          dur: Log.time.duration(entries[i].s, entries[i].e)
        };
      }
    }

    return parsed;
  },

  entries: {

    /**
     * Get entries by date
     * @param {Object} [date] - Date
     * @returns {Object[]} Entries under specified date
     */
    byDate(date = new Date()) {
      if (
        typeof date !== 'object' ||
        date.getTime() > new Date().getTime()
      ) return;

      const entries = [];

      for (let i = 0, l = Log.log.length; i < l; i++) {
        if (Log.log[i].e === undefined) continue;
        const a = Log.time.convert(Log.log[i].s);
        if (
          a.getFullYear() === date.getFullYear() &&
          a.getMonth() === date.getMonth() &&
          a.getDate() === date.getDate()
        ) {
          entries[entries.length] = Log.log[i];
        }
      }

      return entries;
    },

    /**
     * Get entries from a period
     * @param {Object} start - Start date
     * @param {Object} [end] - End date
     * @returns {Object[]} Entries in period
     */
    byPeriod(start, end = new Date()) {
      if (start === undefined) return;
      if (typeof start !== 'object') return;
      if (typeof end !== 'object') return;

      if (start.getTime() > end.getTime()) return;

      let entries = [];

      for (let current = start; current <= end;) {
        entries = entries.concat(Log.data.entries.byDate(current));
        current = current.addDays(1);
      }

      return entries;
    },

    /**
     * Get entries of a specific day of the week
     * @param {number} day - A day of the week (0 - 6)
     * @param {Object[]} [entries] - Entries
     * @returns {Object[]} Entries
     */
    byDay(day, entries = Log.log) {
      if (day === undefined) return;
      if (typeof day !== 'number' || day < 0 || day > 6) return;
      if (typeof entries !== 'object' || entries.length === 0) return;
      if (typeof entries[0] !== 'object') return;

      return entries.filter(({s, e}) => e !== undefined && Log.time.convert(s).getDay() === day);
    },

    /**
     * Get entries of a specific project
     * @param {string} project - Project
     * @param {Object[]} [entries] - Entries
     * @returns {Object[]} Entries
     */
    byPro(project, entries = Log.log) {
      if (project === undefined) return;
      if (typeof project !== 'string' || project.length === 0) return;
      if (typeof entries !== 'object' || entries.length === 0) return;

      return entries.filter(({e, t}) => e !== undefined && t === project);
    },

    /**
     * Get entries of a specific sector
     * @param {string} sector - Sector
     * @param {Object[]} [entries] - Entries
     * @returns {Object[]} Entries
     */
    bySec(sector, entries = Log.log) {
      if (sector === undefined) return;
      if (typeof sector !== 'string' || sector.length === 0) return;
      if (Log.cache.sec.indexOf(sector) === -1) return;
      if (typeof entries !== 'object' || entries.length === 0) return;

      return entries.filter(({e, c}) => e !== undefined && c === sector);
    },
  },

  /**
   * Get entries from the last n days
   * @param {number} [n] - Number of days
   * @returns {Object[]} Entries
   */
  recEnt(n = 1) {
    return typeof n !== 'number' || n < 1 ?
      undefined : Log.data.entries.byPeriod(new Date().addDays(-n));
  },

  /**
   * Sort entries by date
   * @param {Object[]} [entries] - Entries
   * @param {Object} [end] - End date
   * @returns {Object[]} Entries sorted by date
   */
  sortEnt(entries = Log.log, end = new Date()) {
    if (typeof entries !== 'object' || entries.length === 0) return;
    if (typeof entries[0] !== 'object') return;
    if (typeof end !== 'object') return;

    const dates = Log.time.listDates(Log.time.convert(entries[0].s), end);
    const sorted = [];
    const list = [];

    for (let i = 0, l = dates.length; i < l; i++) {
      list[list.length] = Log.time.date(
        Log.time.toHex(new Date(
          dates[i].getFullYear(), dates[i].getMonth(),
          dates[i].getDate(), 0, 0, 0
        ))
      );
      sorted[sorted.length] = [];
    }

    for (let i = 0, l = entries.length; i < l; i++) {
      const x = list.indexOf(Log.time.date(entries[i].s));
      if (x > -1) sorted[x][sorted[x].length] = entries[i];
    }

    return sorted;
  },

  /**
   * Sort entries by day
   * @param {Object[]} [entries] - Entries
   * @returns {Object[]} Entries sorted by day
   */
  sortEntByDay(entries = Log.log) {
    if (typeof entries !== 'object' || entries.length === 0) return;
    const sorted = [];
    for (let i = 0; i < 7; i++) {
      sorted[sorted.length] = Log.data.entries.byDay(i, entries);
    }
    return sorted;
  },

  /**
   * Sort array of objects by values
   * @param {Object[]} entries - Entries
   * @param {number} mode - Sector (0) or project (1)
   * @param {string} hp - Hour or percentage
   * @returns {Object[]} Array of arrays sorted by values
   */
  sortValues(entries, mode, hp) {
    if (entries === undefined || mode === undefined || hp === undefined) return;
    if (typeof entries !== 'object' || entries.length === 0) return;
    if (typeof mode !== 'number' || mode < 0 || mode > 1) return;
    if (typeof hp !== 'number' || hp < 0 || hp > 1) return;

    const list = mode === 0 ? Log.data.listSec(entries) : Log.data.listPro(entries);
    const temp = [];
    const sorted = [];

    for (let i = 0, l = list.length; i < l; i++) {
      const lh = mode === 0 ?
        Log.data.lh(Log.data.entries.bySec(list[i], entries)) :
        Log.data.lh(Log.data.entries.byPro(list[i], entries));
      temp[list[i]] = hp === 0 ? lh : lh / Log.data.lh(entries) * 100;
    }

    const sor = Object.keys(temp).sort((a, b) => temp[a] - temp[b]).reverse();

    for (const key in sor) {
      sorted[sorted.length] = [sor[key], temp[sor[key]]];
    }

    return sorted;
  },

  /**
   * List projects
   * @param {Object[]} [a] - Entries
   * @returns {Object[]} List of projects
   */
  listPro(a = Log.log) {
    if (typeof a !== 'object' || a.length === 0) return;

    const list = [];

    for (let i = a.length - 1; i >= 0; i--) {
      if (a[i].e !== undefined && list.indexOf(a[i].t) === -1) {
        list[list.length] = a[i].t;
      }
    }

    return list;
  },

  /**
   * List sectors
   * @param {Object[]} [a] - Entries
   * @returns {Object[]} List of sectors
   */
  listSec(a = Log.log) {
    if (typeof a !== 'object' || a.length === 0) return;

    const list = [];

    for (let i = a.length - 1; i >= 0; i--) {
      if (a[i].e !== undefined && list.indexOf(a[i].c) === -1) {
        list[list.length] = a[i].c;
      }
    }

    return list;
  },

  /**
   * Get peak days
   * @param {Object[]} [a] - Entries
   * @returns {Object[]} Peak days
   */
  peakDays(a = Log.log) {
    if (typeof a !== 'object' || a.length === 0) return;
    const week = [0, 0, 0, 0, 0, 0, 0];

    for (let i = a.length - 1; i >= 0; i--) {
      if (a[i].e !== undefined) {
        week[Log.time.convert(a[i].s).getDay()] += a[i].dur;
      }
    }

    return week;
  },

  /**
   * Get peak day
   * @param {Object[]} [p] - Peak days
   * @returns {string} Peak day
   */
  peakDay(p = Log.cache.pkd) {
    return typeof p !== 'object' || p.length === 0 ?
      '-' : days[p.indexOf(Math.max(...p))];
  },

  /**
   * Get peak hours
   * @param {Object[]} [ent] - Entries
   * @returns {Object[]} Peak hours
   */
  peakHours(ent = Log.log) {
    if (typeof ent !== 'object' || ent.length === 0) return;

    const hours = [
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ];

    for (let i = ent.length - 1; i >= 0; i--) {
      if (ent[i].e === undefined) continue;

      let index = Log.time.convert(ent[i].s).getHours();
      const rem = ent[i].dur % 1;
      let block = ent[i].dur - rem;

      hours[index] += block - (block - 1);
      index++;

      while (block > 1) {
        if (index > 24) break;
        block--;
        hours[index++] += block - (block - 1);
      }

      hours[index++] += rem;
    }

    return hours;
  },

  /**
   * Get peak hour
   * @param {Object[]} [h] - Peak hours
   * @returns {string} Peak hour
   */
  peakHour(h = Log.cache.pkh) {
    return typeof h !== 'object' || h.length === 0 ?
      '-' : `${h.indexOf(Math.max(...h))}:00`;
  },

  /**
   * List durations
   * @param {Object[]} [a] - Entries
   * @returns {Object[]} List of durations
   */
  listDur(a = Log.log) {
    if (typeof a !== 'object' || a.length === 0) return;

    const durations = [];

    for (let i = 0, l = a.length; i < l; i++) {
      if (a[i].e !== undefined) {
        durations[durations.length] = a[i].dur;
      }
    }

    return durations;
  },

  /**
   * Get minimum value
   * @param {Object[]} v - Values
   * @returns {number} Minimum value
   */
  min(v) {
    return typeof v !== 'object' || v === undefined ?
      '-' : v.length === 0 ? 0 : Math.min(...v);
  },

  /**
   * Get maximum value
   * @param {Object[]} v - Values
   * @returns {number} Maximum value
   */
  max(v) {
    if (v === undefined) return;
    return typeof v !== 'object' || v.length === 0 ?
      '-' : v.length === 0 ? 0 : Math.max(...v);
  },

  /**
   * Calculate average
   * @param {Object[]} v - Values
   * @returns {number} Average
   */
  avg(v) {
    if (v === undefined) return;
    return typeof v !== 'object' || v.length === 0 ?
      '-' : v.length === 0 ? 0 : Log.data.sum(v) / v.length;
  },

  /**
   * Calculate total
   * @param {Object[]} v - Values
   * @returns {number} Total
   */
  sum(v) {
    if (v === undefined) return;
    return typeof v !== 'object' || v.length === 0 ?
      0 : v.reduce((t, n) => t + n, 0);
  },

  /**
   * Calculate the total number of logged hours
   * @param {Object[]} [e] - Entries
   * @returns {number} Total logged hours
   */
  lh(e = Log.log) {
    return e.length === 0 ? 0 : Log.data.sum(Log.data.listDur(e));
  },

  /**
   * Calculate average logged hours
   * @param {Object[]} [e] - Sorted entries
   * @returns {number} Average logged hours
   */
  avgLh(e = Log.cache.sortEnt) {
    return typeof e !== 'object' || e.length === 0 ?
      0 : e.reduce((s, c) => s + Log.data.lh(c), 0) / e.length;
  },

  /**
   * Calculate how much of a time period was logged
   * @param {Object[]} [a] - Entries
   * @returns {number} Log percentage
   */
  lp(a = Log.log) {
    if (typeof a !== 'object') return;
    if (a.length === 0) return 0;

    const e = Log.time.convert(a[0].s);
    const d = Log.time.convert(a.slice(-1)[0].s);
    const n = Math.ceil((
      new Date(d.getFullYear(), d.getMonth(), d.getDate()) -
      new Date(e.getFullYear(), e.getMonth(), e.getDate())
    ) / 864E5);

    return Log.data.lh(a) / (24 * (n + 1)) * 100;
  },

  /**
   * Calculate sector percentage
   * @param {string} s - Sector
   * @param {Object[]} [e] - Entries
   * @returns {number} Sector percentage
   */
  sp(s, e = Log.log) {
    if (s === undefined) return;
    if (typeof s !== 'string' || s.length === 0) return;
    if (typeof e !== 'object') return;

    return e.length === 0 ?
      0 : Log.data.lh(Log.data.entries.bySec(s, e)) / Log.data.lh(e) * 100;
  },

  /**
   * Calculate streak
   * @param {Object[]} [a] - Sorted entries
   * @returns {number} Streak
   */
  streak(a = Log.cache.sortEnt) {
    if (typeof a !== 'object') return;
    let streak = 0;
    if (a.length === 0) return streak;
    for (let i = 0, l = a.length; i < l; i++) {
      streak = a[i].length === 0 ? 0 : streak + 1;
    }
    return streak;
  },

  /**
   * Get an array of focus stats
   * @param {number} m - Sector (0) or project (1)
   * @param {Object[]} [s] - Sorted entries
   * @returns {Object[]} Array of focus stats
   */
  listFocus(m, s = Log.cache.sortEnt) {
    if (m === undefined) return;
    if (typeof m !== 'number' || m < 0 || m > 1) return;
    if (typeof s !== 'object' || s.length === 0) return;

    const list = [];

    for (let i = 0, l = s.length; i < l; i++) {
      if (s[i].length === 0) continue;
      const l = m === 0 ? Log.data.listSec(s[i]) : Log.data.listPro(s[i]);
      if (l === undefined) continue;
      list[list.length] = l.length === 0 ? 0 : 1 / l.length;
    }

    return list;
  },

  /**
   * Calculate project focus
   * @param {Object[]} [p] - Projects
   * @returns {number} Project focus
   */
  proFocus(p = Log.cache.pro) {
    return typeof p !== 'object' || p.length === 0 ? 0 : 1 / p.length;
  },

  forecast: {

    /**
     * Forecast sector focus
     * @returns {string} Sector focus
     */
    sf() {
      if (Log.cache.entByDay.length === 0) return '-';

      const arr = Log.data.listSec(Log.cache.entByDay);

      let f = '';
      let a = 0;

      for (let i = arr.length - 1; i >= 0; i--) {
        let x = Log.data.sp(arr[i], Log.cache.entByDay);
        if (x > a) {
          f = arr[i];
          a = x;
        }
      }

      return f;
    },

    /**
     * Forecast peak time
     * @returns {string} Peak time
     */
    pt() {
      return Log.cache.entByDay.length === 0 ?
        '-' : Log.data.peakHour(Log.data.peakHours(Log.cache.entByDay));
    },

    /**
     * Forecast log hours
     * @returns {number} Log hours
     */
    lh() {
      return Log.cache.entByDay.length === 0 ?
        '-' : Log.data.avg(Log.data.listDur(Log.cache.entByDay)) * 10;
    },

    /**
     * Forecast session duration
     * @returns {number} Session duration
     */
    sd() {
      return Log.cache.entByDay.length === 0 ?
        '-' : Log.data.avg(Log.data.listDur(Log.cache.entByDay));
    },
  },

  /**
   * Generate data for bar chart
   * @param {Object[]} [ent] - Entries
   * @returns {Object[]} Bar chart data
   */
  bar(ent = Log.log) {
    if (typeof ent !== 'object' || ent.length === 0) return;

    const sort = Log.data.sortEnt(ent);

    let set = [];
    let colour = '';
    let lastHeight = 0;
    let height = 0;

    switch (Log.config.ui.colourMode) {
      case 'sector':
      case 'sec':
        colour = 'sc';
        break;
      case 'project':
      case 'pro':
        colour = 'pc';
        break;
      default:
        colour = Log.config.ui.colour;
        break;
    }

    for (let i = sort.length - 1; i >= 0; i--) {
      set[i] = [];

      const l = sort[i].length;
      if (l === 0) continue;

      if (Log.config.ui.colourMode === 'none') {
        set[i][set[i].length] = {
          col: colour,
          pos: '0%',
          wh: `${Log.data.lp(sort[i])}%`
        }
      } else {
        for (let o = 0; o < l; o++) {
          if (sort[i][o].e === undefined) continue;

          o === 0 && (lastHeight = 0);

          height = (
            Log.time.parse(sort[i][o].e) - Log.time.parse(sort[i][o].s)
          ) / 86400 * 100;

          set[i][set[i].length] = {
            col: sort[i][o][colour] || colour,
            pos: `${lastHeight}%`,
            wh: `${height}%`
          }

          lastHeight += height;
        }
      }
    }

    return set;
  },

  /**
   * Generate data for line visualisation
   * @param {Object[]} [ent] - Entries
   * @returns {Object[]} Line visualisation data
   */
  line(ent = Log.log) {
    if (typeof ent !== 'object' || ent.length === 0) return;

    const sort = Log.data.sortEnt(ent);

    let data = [];
    let colour = '';
    let lastPosition = 0;

    switch (Log.config.ui.colourMode) {
      case 'project':
      case 'pro':
        colour = 'pc';
        break;
      case 'sector':
      case 'sec':
        colour = 'sc';
        break;
      default:
        colour = Log.config.ui.colour;
        break;
    }

    for (let i = sort.length - 1; i >= 0; i--) {
      data[i] = [];

      if (sort[i].length === 0) continue;

      for (let o = 0, ol = sort[i].length; o < ol; o++) {
        if (sort[i][o] === undefined) continue;

        o === 0 && (lastPosition = 0);

        const width = sort[i][o].dur * 3600 / 86400 * 100;
        const dp = Log.utils.calcDP(sort[i][o].s);

        data[i][data[i].length] = {
          col: sort[i][o][colour] || colour,
          mg: `${dp - lastPosition}%`,
          wd: `${width}%`
        }

        lastPosition = width + dp;
      }
    }

    return data;
  }
};
