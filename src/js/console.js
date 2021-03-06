const timer = require('headless-work-timer');

Log.console = {
  history: [],

  /**
   * Parse command
   * @param {string} i - Input
   */
  parse(i) {
    const p = Log.console.getParams(i);
    switch (i.split(' ')[0].toLowerCase()) {
      case 'start':
      case 'begin':
        Log.console.startLog(i);
        break;
      case 'pomodoro':
      case 'tomato':
        Log.console.startPomodoro(i);
        break;
      case 'stop':
      case 'end':
      case 'pause':
        Log.console.endLog();
        Log.stopTimer ? Log.stopTimer() : 'noop';
        break;
      case 'resume':
      case 'continue':
        Log.console.resume();
        break;
      case 'edit':
        Log.console.edit(p[1], p[2], p[3]);
        break;
      case 'delete':
        Log.console.delete(i);
        break;
      case 'set':
        Log.console.set(i);
        break;
      case 'import':
        Log.console.importUser();
        break;
      case 'export':
        Log.console.exportUser();
        break;
      case 'rename':
        Log.console.rename(p[1], p[2], p[3]);
        break;
      case 'invert':
        Log.console.invert();
        break;
      case 'quit':
      case 'exit':
        app.quit();
        break;
      default:
        return;
    }
  },

  /**
   * Get quoted parameters from string
   * @param {string} s - String
   * @return {Object[]} Parameters
   */
  getParams(s) {
    if (s === undefined) return;
    if (typeof s !== 'string' || !s.includes('"')) return;

    const part = s.slice(0, s.indexOf('"') - 1).split(' ');
    const p = s.split('');
    const params = [];
    const x = []; // indices
    let param = '';

    part.map(e => !e.includes('"') && (params[params.length] = e));
    p.map((e, i) => e === '"' && (x[x.length] = i));

    for (let i = 0, l = x.length; i < l; i++) {
      for (let o = x[i] + 1; o < x[i + 1]; o++) {
        param += p[o];
      }
      params[params.length] = param;
      param = '';
      i++;
    }

    return params;
  },

  /**
   * Import user data
   */
  importUser() {
    const path = dialog.showOpenDialog({
      properties: ['openFile']
    });

    if (!path) return;

    let s = '';

    try {
      s = fs.readFileSync(path[0], 'utf-8');
    } catch (e) {
      new window.Notification('An error occured while trying to load this file.');
      return;
    }

    Log.path = path[0];
    localStorage.setItem('logDataPath', path[0]);
    dataStore.path = Log.path;

    localStorage.setItem('user', s);
    user = JSON.parse(localStorage.getItem('user'));

    new window.Notification('Log data was successfully imported.');
    Log.reset();
    Log.load();
  },

  /**
   * Export user data
   */
  exportUser() {
    const data = JSON.stringify(JSON.parse(localStorage.getItem('user')));

    dialog.showSaveDialog(file => {
      if (file === undefined) return;
      fs.writeFile(file, data, err => {
        if (err) {
          new window.Notification(`An error occured creating the file ${err.message}`);
        } else {
          new window.Notification('Your log data has been exported.');
        }
      });
    });
  },

  /**
   * Start a log entry with pomodoro timing
   * @param {Object[]} s - Input array
   */
  startPomodoro(s) {
    const clock = timer()()((state, phaseChanged) => {
      if (phaseChanged) {
        state.phase === 'break' || state.phase === 'longBreak' ?
          Log.console.endLog() : Log.console.startLog(s);

        state.phase === 'break' || state.phase === 'longBreak' ?
          Log.playSoundEffect('timerEnd') : Log.playSoundEffect('timerStart');

        new window.Notification(`Started ${state.phase}`);
      }
    });

    Log.stopTimer = _ => clock.stop();
    Log.console.startLog(s);
  },

  /**
   * Start a log entry
   * @param {Object[]} s - Input array
   */
  startLog(s) {
    if (s === undefined) return;
    if (user.log !== 0 && user.log.slice(-1)[0].e === undefined);
    Log.console.endLog();

    let p = [];
    let indices = [];
    let c = ''; // sector
    let t = ''; // project
    let d = ''; // description

    if (s.includes('"')) {
      p = s.split('');

      p.map((e, i) => e === '"' && (indices[indices.length] = i));

      for (let i = indices[0] + 1; i < indices[1]; i++) c += p[i];
      for (let i = indices[2] + 1; i < indices[3]; i++) t += p[i];
      for (let i = indices[4] + 1; i < indices[5]; i++) d += p[i];
    } else {
      if (s.includes(';')) {
        p = s.split(';');
      } else if (s.includes('|')) {
        p = s.split('|');
      } else if (s.includes(',')) {
        p = s.split(',');
      } else return;

      c = p[0].substring(6, p[0].length).trim();
      t = p[1].trim();
      d = p[2].trim();
    }

    user.log[user.log.length] = {
      c,
      t,
      d,
      s: Log.time.toHex(new Date()),
      e: undefined
    }

    new window.Notification(`Log started: ${c} - ${t} - ${d}`);
    Log.options.update.log();
  },

  /**
   * End a log entry
   */
  endLog() {
    if (Log.log === undefined) return;
    if (Log.log.length === 0) return;

    const last = user.log.slice(-1)[0];
    if (last.e !== undefined) return;

    last.e = Log.time.toHex(new Date());
    clearInterval(timer);

    new window.Notification(`Log ended: ${last.c} - ${last.t} - ${last.d}`);
    Log.options.update.log();
  },

  /**
   * Resume a paused log entry
   */
  resume() {
    if (Log.log === undefined) return;
    if (Log.log.length === 0) return;

    const last = user.log.slice(-1)[0];
    if (last.e === undefined) return;

    user.log[user.log.length] = {
      s: Log.time.toHex(new Date()),
      e: undefined,
      c: last.c,
      t: last.t,
      d: last.d
    }

    new window.Notification(`Log resumed: ${last.c} - ${last.t} - ${last.d}`);
    Log.options.update.log();
  },

  /**
   * Set a config attribute
   * @param {string} i - Input
   */
  set(i) {
    const c = i.split(' ');
    switch (c[1].toLowerCase()) {
      case 'view':
        Log.options.setView(c[2]);
        break;
      case 'background':
      case 'bg':
        Log.options.setBG(c[2]);
        break;
      case 'color':
      case 'colour':
      case 'text':
        Log.options.setColour(c[2]);
        break;
      case 'highlight':
      case 'accent':
        Log.options.setAccent(c[2]);
        break;
      case 'colourmode':
      case 'colormode':
        Log.options.setColourMode(c[2]);
        break;
      case 'cal':
      case 'calendar':
        Log.options.setCalendar(c[2]);
        break;
      case 'time':
        Log.options.setTimeFormat(c[2]);
        break;
      case 'category':
      case 'sector':
      case 'cat':
      case 'sec':
        Log.options.setColourCode(0, i);
        break;
      case 'project':
      case 'pro':
        Log.options.setColourCode(1, i);
        break;
      default:
        return;
    }
  },

  /**
   * Delete one or more logs
   * @param {string} i - Input
   */
  delete(i) {
    if (Log.log === undefined) return;
    if (Log.log.length === 0) return;

    // all except first word are entry indices
    const words = i.split(' ').slice(1);

    if (words[0] === 'project') {
      user.log.forEach((e, id) => {
        if (e.t === words[1]) user.log.splice(id, 1);
      });
    } else if (words[0] === 'sector') {
      user.log.forEach((e, id) => {
        if (e.c === words[1]) user.log.splice(id, 1);
      });
    } else {
      // aui = ascending unique indices
      const aui = words.filter((v, i, self) => self.indexOf(v) === i).sort();
      // remove all indices. We start from the highest to avoid the shifting of indices after removal.
      aui.reverse().forEach(i => user.log.splice(Number(i) - 1, 1));
    }

    Log.options.update.all();
  },

  /**
   * Edit a log
   * @param {string} i - Entry ID
   * @param {string} a - Entry attribute
   * @param {string} v - Value
   */
  edit(i, a, v) {
    if (user.log.length === 0) return;
    const id = Number(i) - 1;

    switch (a) {
      case 'start':
        user.log[id].s = Log.time.convertDateTime(v);
        break;
      case 'end':
        user.log[id].e = Log.time.convertDateTime(v);
        break;
      case 'sector':
      case 'sec':
        user.log[id].c = v;
        break;
      case 'project':
      case 'title':
      case 'pro':
        user.log[id].t = v;
        break;
      case 'description':
      case 'desc':
      case 'dsc':
        user.log[id].d = v;
        break;
      case 'duration':
      case 'dur':
        const dur = parseInt(v, 10) * 60 || 0;
        user.log[id].e = Log.time.offset(user.log[id].s, dur);
        break;
      default:
        return;
    }

    Log.options.update.all();
  },

  /**
   * Rename a sector or project
   * @param {string} m - Sector or project
   * @param {string} o - Old name
   * @param {string} n - New name
   */
  rename(m, o, n) {
    if (['sec', 'sector', 'pro', 'project'].indexOf(m) === -1) return;
    m = (m === 'sector' || m === 'sec') ? 'sector' : 'project';

    const nf = _ => {
      new window.Notification(`The ${m} "${o}" does not exist in your logs`);
    };

    if (m === 'sector') {
      if (Log.data.entries.bySec(o).length !== 0) {
        user.log.map((e) => {
          if (e.c === o) e.c = n;
        });
      } else {
        nf();
        return;
      }
    } else {
      if (Log.data.entries.byPro(o).length !== 0) {
        user.log.map((e) => {
          if (e.t === o) e.t = n;
        });
      } else {
        nf();
        return;
      }
    }

    new window.Notification(`The ${m} "${o}" has been renamed to "${n}"`);
    Log.options.update.all();
  },

  /**
   * Invert interface colours
   */
  invert() {
    const c = user.config.ui.colour;
    const b = user.config.ui.bg;

    user.config.ui.colour = b;
    user.config.ui.bg = c;

    Log.options.update.config();
  }
};
