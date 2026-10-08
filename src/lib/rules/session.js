/**
 * People the dashboard has seen, keyed on email: the signed-in account
 * and everyone named on a case the backend returned. Filled at runtime
 * only — there is no built-in list of people.
 */
export const PEOPLE = {};

const COLOURS = ["#2536cf", "#0d6157", "#101a5c", "#8a3ffc", "#b8336a", "#c75b12", "#1f7a3a", "#5b6b7f"];

function colourFor(email) {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return COLOURS[h % COLOURS.length];
}

/** The signed-in backend user, in the shape the rest of the app reads. */
export function sessionFromAuthUser(authUser) {
  const user = {
    n: authUser.name,
    e: authUser.email,
    r: authUser.role,
    c: colourFor(authUser.email),
    t: authUser.isAdmin ? "Admin" : "",
    team: authUser.team || null,
    org: authUser.supplierOrg || null,
    admin: authUser.isAdmin,
  };
  PEOPLE[authUser.email] = user;
  return {
    me: authUser.email,
    user,
    role: user.r,
    isAdmin: !!user.admin,
    org: user.org,
    team: user.team,
  };
}

/** Registers a person named on a case ({id, name, email, team}); returns the key to look them up by. */
export function registerPerson(person) {
  if (!person) return null;
  if (!PEOPLE[person.email]) {
    PEOPLE[person.email] = {
      n: person.name,
      e: person.email,
      r: "",
      c: colourFor(person.email),
      t: "",
      team: person.team || null,
    };
  }
  return person.email;
}

export const personName = (key) => (key && PEOPLE[key] ? PEOPLE[key].n : "");
