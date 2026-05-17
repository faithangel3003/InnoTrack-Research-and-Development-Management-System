window.innoTrackAuth = {
  getSession: function () {
    return localStorage.getItem("innotrack.auth.session");
  },
  setSession: function (value) {
    localStorage.setItem("innotrack.auth.session", value);
  },
  clearSession: function () {
    localStorage.removeItem("innotrack.auth.session");
  }
};
