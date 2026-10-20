// ===== Simple Accounting System (with Supabase) =====

// 1. PUT YOUR OWN SUPABASE DETAILS HERE
var SUPABASE_URL = "https://tzrbwnxfnltzsbvsxumz.supabase.co";
var SUPABASE_KEY = "sb_publishable_ryV8utzh43evlDaUH7cALA__Bz_9h4n";

// The Supabase client (named db because "supabase" is used by the library)
var db = null;
if (SUPABASE_URL.indexOf("YOUR-PROJECT") != -1 || SUPABASE_KEY.indexOf("YOUR-PUBLISHABLE-KEY") != -1) {
  alert("Supabase is not set up yet. Put your URL and key at the top of script.js.");
} else {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Returns false (and shows a message) if Supabase is not connected
function dbReady() {
  if (db == null) {
    alert("Supabase is not connected. Put your URL and key at the top of script.js.");
    return false;
  }
  return true;
}

// These lists are filled from the database when the page opens
var accounts = [];
var entries = [];
// Each entry looks like: { id, kind, date, desc, debit, credit, amount }

// Get all accounts and entries from Supabase
async function loadData() {
  if (!dbReady()) { return; }
  var result = await db.from("accounts").select("*").order("code");
  if (result.error) {
    alert("Could not load accounts: " + result.error.message);
    return;
  }
  accounts = result.data;

  result = await db.from("entries").select("*").order("id");
  if (result.error) {
    alert("Could not load entries: " + result.error.message);
    return;
  }

  entries = [];
  for (var i = 0; i < result.data.length; i++) {
    var r = result.data[i];
    entries.push({
      id: r.id,
      kind: r.kind,
      date: r.date,
      desc: r.description,
      debit: r.debit,
      credit: r.credit,
      amount: Number(r.amount)
    });
  }

  refresh();
}

// Show one page and hide the others
function showPage(id) {
  var pages = document.getElementsByClassName("page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].style.display = "none";
  }
  document.getElementById(id).style.display = "block";

  if (id == "trial") {
    showTrialBalance();
  }
}

// Get the name of an account using its code
function getAccountName(code) {
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].code == code) {
      return accounts[i].name;
    }
  }
  return code;
}

// ===== CHART OF ACCOUNTS =====

async function addAccount() {
  if (!dbReady()) { return; }
  var code = document.getElementById("accCode").value;
  var name = document.getElementById("accName").value;
  var type = document.getElementById("accType").value;

  if (code == "" || name == "") {
    alert("Please enter a code and a name.");
    return;
  }

  // make sure the code is not used already
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].code == code) {
      alert("That account code already exists.");
      return;
    }
  }

  var result = await db.from("accounts").insert({
    code: Number(code),
    name: name,
    type: type
  });
  if (result.error) {
    alert("Error: " + result.error.message);
    return;
  }

  document.getElementById("accCode").value = "";
  document.getElementById("accName").value = "";
  await loadData();
}

async function deleteAccount(index) {
  if (!dbReady()) { return; }
  var code = accounts[index].code;

  // do not delete an account that is already used
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].debit == code || entries[i].credit == code) {
      alert("This account is used in an entry, so it cannot be deleted.");
      return;
    }
  }

  var result = await db.from("accounts").delete().eq("code", code);
  if (result.error) {
    alert("Error: " + result.error.message);
    return;
  }
  await loadData();
}

function showAccounts() {
  var html = "<tr><th>Code</th><th>Account Name</th><th>Type</th><th></th></tr>";
  for (var i = 0; i < accounts.length; i++) {
    html += "<tr>";
    html += "<td>" + accounts[i].code + "</td>";
    html += "<td>" + accounts[i].name + "</td>";
    html += "<td>" + accounts[i].type + "</td>";
    html += "<td><button onclick='deleteAccount(" + i + ")'>Delete</button></td>";
    html += "</tr>";
  }
  document.getElementById("accountTable").innerHTML = html;
}

// Fill the debit/credit dropdown lists with the accounts
function fillDropdowns() {
  var ids = ["tDebit", "tCredit", "aDebit", "aCredit"];
  var options = "";
  for (var i = 0; i < accounts.length; i++) {
    options += "<option value='" + accounts[i].code + "'>" + accounts[i].code + " - " + accounts[i].name + "</option>";
  }
  for (var j = 0; j < ids.length; j++) {
    document.getElementById(ids[j]).innerHTML = options;
  }
}

// ===== TRANSACTIONS AND ADJUSTMENTS =====

// kind is either "transaction" or "adjustment"
async function addEntry(kind) {
  if (!dbReady()) { return; }
  var p = "t";
  if (kind == "adjustment") {
    p = "a";
  }

  var date = document.getElementById(p + "Date").value;
  var desc = document.getElementById(p + "Desc").value;
  var debit = document.getElementById(p + "Debit").value;
  var credit = document.getElementById(p + "Credit").value;
  var amount = parseFloat(document.getElementById(p + "Amount").value);

  if (date == "" || desc == "") {
    alert("Please enter a date and a description.");
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter an amount greater than 0.");
    return;
  }
  if (debit == credit) {
    alert("Debit and credit must be different accounts.");
    return;
  }

  var result = await db.from("entries").insert({
    kind: kind,
    date: date,
    description: desc,
    debit: Number(debit),
    credit: Number(credit),
    amount: amount
  });
  if (result.error) {
    alert("Error: " + result.error.message);
    return;
  }

  document.getElementById(p + "Desc").value = "";
  document.getElementById(p + "Amount").value = "";
  await loadData();
}

async function deleteEntry(index) {
  if (!dbReady()) { return; }
  var result = await db.from("entries").delete().eq("id", entries[index].id);
  if (result.error) {
    alert("Error: " + result.error.message);
    return;
  }
  await loadData();
}

function showEntries() {
  var kinds = ["transaction", "adjustment"];

  for (var k = 0; k < kinds.length; k++) {
    var html = "<tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Amount</th><th></th></tr>";

    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.kind == kinds[k]) {
        html += "<tr>";
        html += "<td>" + e.date + "</td>";
        html += "<td>" + e.desc + "</td>";
        html += "<td>" + getAccountName(e.debit) + "</td>";
        html += "<td>" + getAccountName(e.credit) + "</td>";
        html += "<td>" + e.amount.toFixed(2) + "</td>";
        html += "<td><button onclick='deleteEntry(" + i + ")'>Delete</button></td>";
        html += "</tr>";
      }
    }

    document.getElementById(kinds[k] + "Table").innerHTML = html;
  }
}

// ===== TRIAL BALANCE =====

// Add up the debits and subtract the credits for one account.
// kind can be "transaction", "adjustment" or "all"
function getBalance(code, kind) {
  var total = 0;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (kind != "all" && e.kind != kind) {
      continue;
    }
    if (e.debit == code) {
      total = total + e.amount;
    }
    if (e.credit == code) {
      total = total - e.amount;
    }
  }
  return Math.round(total * 100) / 100;
}

// A positive balance goes in the debit column, a negative one in the credit column
function debitPart(balance) {
  if (balance > 0) { return balance; }
  return 0;
}

function creditPart(balance) {
  if (balance < 0) { return -balance; }
  return 0;
}

// Show a number, or nothing if it is zero
function show(n) {
  if (n == 0) { return ""; }
  return n.toFixed(2);
}

function showTrialBalance() {
  var html = "<tr><th rowspan='2'>Account</th><th colspan='2'>Unadjusted</th><th colspan='2'>Adjustments</th><th colspan='2'>Adjusted</th></tr>";
  html += "<tr><th>Debit</th><th>Credit</th><th>Debit</th><th>Credit</th><th>Debit</th><th>Credit</th></tr>";

  var totals = [0, 0, 0, 0, 0, 0];

  for (var i = 0; i < accounts.length; i++) {
    var code = accounts[i].code;
    var unadj = getBalance(code, "transaction");
    var adj = getBalance(code, "adjustment");
    var adjusted = Math.round((unadj + adj) * 100) / 100;

    // skip accounts that have no activity
    if (unadj == 0 && adj == 0) {
      continue;
    }

    var row = [debitPart(unadj), creditPart(unadj), debitPart(adj), creditPart(adj), debitPart(adjusted), creditPart(adjusted)];

    html += "<tr><td>" + accounts[i].name + "</td>";
    for (var j = 0; j < 6; j++) {
      html += "<td>" + show(row[j]) + "</td>";
      totals[j] = totals[j] + row[j];
    }
    html += "</tr>";
  }

  html += "<tr class='total'><td>TOTAL</td>";
  for (var k = 0; k < 6; k++) {
    totals[k] = Math.round(totals[k] * 100) / 100;
    html += "<td>" + totals[k].toFixed(2) + "</td>";
  }
  html += "</tr>";

  document.getElementById("trialTable").innerHTML = html;

  var message = document.getElementById("trialMessage");
  if (totals[0] == totals[1] && totals[2] == totals[3] && totals[4] == totals[5]) {
    message.innerHTML = "The trial balance is balanced.";
  } else {
    message.innerHTML = "The trial balance is NOT balanced. Please check your entries.";
  }
}

// ===== EXTRA BUTTONS =====

async function clearAll() {
  if (!dbReady()) { return; }
  if (confirm("Delete all entries?")) {
    var result = await db.from("entries").delete().neq("id", 0);
    if (result.error) {
      alert("Error: " + result.error.message);
      return;
    }
    await loadData();
  }
}

// Update everything on the screen
function refresh() {
  fillDropdowns();
  showAccounts();
  showEntries();
}

// When the page opens
document.getElementById("tDate").value = new Date().toISOString().slice(0, 10);
document.getElementById("aDate").value = new Date().toISOString().slice(0, 10);
showPage("accounts");
loadData();