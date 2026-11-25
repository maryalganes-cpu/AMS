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

// What are we editing right now? (null means we are adding something new)
var editingAccountCode = null;
var editingEntryId = null;
var editingKind = "";

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

  // highlight the menu button of the page we are on
  var buttons = document.getElementsByClassName("menubtn");
  for (var b = 0; b < buttons.length; b++) {
    if (buttons[b].id == "menu-" + id) {
      buttons[b].className = "menubtn active";
    } else {
      buttons[b].className = "menubtn";
    }
  }

  if (id == "trial") {
    showTrialBalance();
  }
  if (id == "adjusted") {
    showAdjustedTrialBalance();
  }
  if (id == "income") {
    showIncomeStatement();
  }
  if (id == "equity") {
    showEquityStatement();
  }
  if (id == "position") {
    showFinancialPosition();
  }
  if (id == "cashflow") {
    showCashFlow();
  }
  if (id == "dashboard") {
    showDashboard();
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

  // if we are editing, update the account instead of adding a new one
  if (editingAccountCode != null) {
    var update = await db.from("accounts").update({ name: name, type: type }).eq("code", editingAccountCode);
    if (update.error) {
      alert("Error: " + update.error.message);
      return;
    }
    cancelAccountEdit();
    await loadData();
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

  if (editingAccountCode == code) {
    cancelAccountEdit();
  }

  var result = await db.from("accounts").delete().eq("code", code);
  if (result.error) {
    alert("Error: " + result.error.message);
    return;
  }
  await loadData();
}

// Put an account into the form so it can be edited
function editAccount(index) {
  var a = accounts[index];
  editingAccountCode = a.code;
  document.getElementById("accCode").value = a.code;
  document.getElementById("accCode").disabled = true;   // the code cannot be changed
  document.getElementById("accName").value = a.name;
  document.getElementById("accType").value = a.type;
  document.getElementById("accSaveBtn").innerHTML = "Save Changes";
  document.getElementById("accCancelBtn").style.display = "inline-block";
  document.getElementById("accNotice").innerHTML = "Editing account " + a.code + ". The code cannot be changed.";
  window.scrollTo(0, 0);
}

// Stop editing and go back to adding a new account
function cancelAccountEdit() {
  editingAccountCode = null;
  document.getElementById("accCode").value = "";
  document.getElementById("accCode").disabled = false;
  document.getElementById("accName").value = "";
  document.getElementById("accType").value = "Asset";
  document.getElementById("accSaveBtn").innerHTML = "Add Account";
  document.getElementById("accCancelBtn").style.display = "none";
  document.getElementById("accNotice").innerHTML = "";
}

function showAccounts() {
  var html = "<tr><th>Code</th><th>Account Name</th><th>Type</th><th></th></tr>";
  for (var i = 0; i < accounts.length; i++) {
    html += "<tr>";
    html += "<td>" + accounts[i].code + "</td>";
    html += "<td>" + accounts[i].name + "</td>";
    html += "<td>" + accounts[i].type + "</td>";
    html += "<td><button class='small secondary' onclick='editAccount(" + i + ")'>Edit</button> <button class='small danger' onclick='deleteAccount(" + i + ")'>Delete</button></td>";
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
    var box = document.getElementById(ids[j]);
    var oldValue = box.value;      // remember what was selected
    box.innerHTML = options;
    if (oldValue != "") {
      box.value = oldValue;
    }
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

  var entryData = {
    kind: kind,
    date: date,
    description: desc,
    debit: Number(debit),
    credit: Number(credit),
    amount: amount
  };

  var result;
  if (editingEntryId != null && editingKind == kind) {
    // we are editing, so update the existing entry
    result = await db.from("entries").update(entryData).eq("id", editingEntryId);
  } else {
    // we are adding a new entry
    result = await db.from("entries").insert(entryData);
  }
  if (result.error) {
    alert("Error: " + result.error.message);
    return;
  }

  cancelEntryEdit(kind);
  await loadData();
}

// Put an entry into its form so it can be edited
function editEntry(index) {
  var e = entries[index];

  // stop any other edit first
  if (editingKind != "") {
    cancelEntryEdit(editingKind);
  }

  var p = "t";
  if (e.kind == "adjustment") {
    p = "a";
  }

  editingEntryId = e.id;
  editingKind = e.kind;

  document.getElementById(p + "Date").value = e.date;
  document.getElementById(p + "Desc").value = e.desc;
  document.getElementById(p + "Debit").value = e.debit;
  document.getElementById(p + "Credit").value = e.credit;
  document.getElementById(p + "Amount").value = e.amount;
  document.getElementById(p + "SaveBtn").innerHTML = "Save Changes";
  document.getElementById(p + "CancelBtn").style.display = "inline-block";
  document.getElementById(p + "Notice").innerHTML = "You are editing an existing entry.";
  window.scrollTo(0, 0);
}

// Stop editing and clear the form
function cancelEntryEdit(kind) {
  var p = "t";
  var buttonText = "Add Transaction";
  if (kind == "adjustment") {
    p = "a";
    buttonText = "Add Adjustment";
  }

  if (editingKind == kind) {
    editingEntryId = null;
    editingKind = "";
  }

  document.getElementById(p + "Desc").value = "";
  document.getElementById(p + "Amount").value = "";
  document.getElementById(p + "SaveBtn").innerHTML = buttonText;
  document.getElementById(p + "CancelBtn").style.display = "none";
  document.getElementById(p + "Notice").innerHTML = "";
}

async function deleteEntry(index) {
  if (!dbReady()) { return; }
  if (editingEntryId == entries[index].id) {
    cancelEntryEdit(editingKind);
  }
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
        html += "<td><button class='small secondary' onclick='editEntry(" + i + ")'>Edit</button> <button class='small danger' onclick='deleteEntry(" + i + ")'>Delete</button></td>";
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

// ===== ADJUSTED TRIAL BALANCE =====

function showAdjustedTrialBalance() {
  var html = "<tr><th>Account</th><th>Debit</th><th>Credit</th></tr>";
  var totalDebit = 0;
  var totalCredit = 0;

  for (var i = 0; i < accounts.length; i++) {
    var balance = getBalance(accounts[i].code, "all");

    // skip accounts that have no activity
    if (balance == 0) {
      continue;
    }

    var d = debitPart(balance);
    var c = creditPart(balance);
    totalDebit = totalDebit + d;
    totalCredit = totalCredit + c;

    html += "<tr><td>" + accounts[i].name + "</td><td>" + show(d) + "</td><td>" + show(c) + "</td></tr>";
  }

  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  html += "<tr class='total'><td>TOTAL</td><td>" + totalDebit.toFixed(2) + "</td><td>" + totalCredit.toFixed(2) + "</td></tr>";

  document.getElementById("adjustedTable").innerHTML = html;

  var message = document.getElementById("adjustedMessage");
  if (totalDebit == totalCredit) {
    message.innerHTML = "The adjusted trial balance is balanced.";
  } else {
    message.innerHTML = "The adjusted trial balance is NOT balanced. Please check your entries.";
  }
}

// ===== INCOME STATEMENT =====

// Revenue minus expenses (uses the adjusted balances)
function getNetIncome() {
  var revenue = 0;
  var expenses = 0;
  for (var i = 0; i < accounts.length; i++) {
    var balance = getBalance(accounts[i].code, "all");
    if (accounts[i].type == "Revenue") {
      revenue = revenue - balance;
    }
    if (accounts[i].type == "Expense") {
      expenses = expenses + balance;
    }
  }
  return Math.round((revenue - expenses) * 100) / 100;
}

function showIncomeStatement() {
  var html = "<tr><th>Account</th><th>Amount</th></tr>";
  var totalRevenue = 0;
  var totalExpenses = 0;

  // Revenue
  html += "<tr class='total'><td>Revenue</td><td></td></tr>";
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].type == "Revenue") {
      var amount = -getBalance(accounts[i].code, "all");
      if (amount != 0) {
        html += "<tr><td>" + accounts[i].name + "</td><td>" + amount.toFixed(2) + "</td></tr>";
        totalRevenue = totalRevenue + amount;
      }
    }
  }
  totalRevenue = Math.round(totalRevenue * 100) / 100;
  html += "<tr class='total'><td>Total Revenue</td><td>" + totalRevenue.toFixed(2) + "</td></tr>";

  // Expenses
  html += "<tr class='total'><td>Expenses</td><td></td></tr>";
  for (var j = 0; j < accounts.length; j++) {
    if (accounts[j].type == "Expense") {
      var expense = getBalance(accounts[j].code, "all");
      if (expense != 0) {
        html += "<tr><td>" + accounts[j].name + "</td><td>" + expense.toFixed(2) + "</td></tr>";
        totalExpenses = totalExpenses + expense;
      }
    }
  }
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  html += "<tr class='total'><td>Total Expenses</td><td>" + totalExpenses.toFixed(2) + "</td></tr>";

  // Net income or net loss
  var netIncome = getNetIncome();
  if (netIncome >= 0) {
    html += "<tr class='total'><td>NET INCOME</td><td>" + netIncome.toFixed(2) + "</td></tr>";
  } else {
    html += "<tr class='total'><td>NET LOSS</td><td>" + (-netIncome).toFixed(2) + "</td></tr>";
  }

  document.getElementById("incomeTable").innerHTML = html;
}

// ===== STATEMENT OF OWNER'S EQUITY =====

function showEquityStatement() {
  var capital = 0;
  var drawings = 0;

  // Look at the Equity accounts. Accounts with "drawing" in the name are drawings.
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].type == "Equity") {
      var balance = getBalance(accounts[i].code, "all");
      if (accounts[i].name.toLowerCase().indexOf("drawing") != -1) {
        drawings = drawings + balance;
      } else {
        capital = capital - balance;
      }
    }
  }

  var netIncome = getNetIncome();
  var ending = Math.round((capital + netIncome - drawings) * 100) / 100;

  var html = "<tr><th>Description</th><th>Amount</th></tr>";
  html += "<tr><td>Owner's Capital</td><td>" + capital.toFixed(2) + "</td></tr>";
  if (netIncome >= 0) {
    html += "<tr><td>Add: Net Income</td><td>" + netIncome.toFixed(2) + "</td></tr>";
  } else {
    html += "<tr><td>Less: Net Loss</td><td>" + (-netIncome).toFixed(2) + "</td></tr>";
  }
  html += "<tr><td>Less: Owner's Drawings</td><td>" + drawings.toFixed(2) + "</td></tr>";
  html += "<tr class='total'><td>ENDING OWNER'S CAPITAL</td><td>" + ending.toFixed(2) + "</td></tr>";

  document.getElementById("equityTable").innerHTML = html;
}


// ===== STATEMENT OF FINANCIAL POSITION =====

// Show a number. Negative numbers go in brackets, like (100.00)
function money(n) {
  n = Math.round(n * 100) / 100;
  if (n < 0) {
    return "(" + (-n).toFixed(2) + ")";
  }
  return n.toFixed(2);
}

function showFinancialPosition() {
  var html = "<tr><th>Account</th><th>Amount</th></tr>";

  // Assets
  var totalAssets = 0;
  html += "<tr class='total'><td>ASSETS</td><td></td></tr>";
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].type == "Asset") {
      var assetBalance = getBalance(accounts[i].code, "all");
      if (assetBalance != 0) {
        html += "<tr><td>" + accounts[i].name + "</td><td>" + money(assetBalance) + "</td></tr>";
        totalAssets = totalAssets + assetBalance;
      }
    }
  }
  totalAssets = Math.round(totalAssets * 100) / 100;
  html += "<tr class='total'><td>TOTAL ASSETS</td><td>" + money(totalAssets) + "</td></tr>";

  // Liabilities
  var totalLiabilities = 0;
  html += "<tr class='total'><td>LIABILITIES</td><td></td></tr>";
  for (var j = 0; j < accounts.length; j++) {
    if (accounts[j].type == "Liability") {
      var liabilityAmount = -getBalance(accounts[j].code, "all");
      if (liabilityAmount != 0) {
        html += "<tr><td>" + accounts[j].name + "</td><td>" + money(liabilityAmount) + "</td></tr>";
        totalLiabilities = totalLiabilities + liabilityAmount;
      }
    }
  }
  totalLiabilities = Math.round(totalLiabilities * 100) / 100;
  html += "<tr class='total'><td>TOTAL LIABILITIES</td><td>" + money(totalLiabilities) + "</td></tr>";

  // Owner's equity (same idea as the Statement of Owner's Equity)
  var capital = 0;
  var drawings = 0;
  for (var k = 0; k < accounts.length; k++) {
    if (accounts[k].type == "Equity") {
      var equityBalance = getBalance(accounts[k].code, "all");
      if (accounts[k].name.toLowerCase().indexOf("drawing") != -1) {
        drawings = drawings + equityBalance;
      } else {
        capital = capital - equityBalance;
      }
    }
  }
  var netIncome = getNetIncome();
  var totalEquity = Math.round((capital + netIncome - drawings) * 100) / 100;

  html += "<tr class='total'><td>OWNER'S EQUITY</td><td></td></tr>";
  html += "<tr><td>Owner's Capital</td><td>" + money(capital) + "</td></tr>";
  if (netIncome >= 0) {
    html += "<tr><td>Add: Net Income</td><td>" + money(netIncome) + "</td></tr>";
  } else {
    html += "<tr><td>Less: Net Loss</td><td>" + money(-netIncome) + "</td></tr>";
  }
  html += "<tr><td>Less: Owner's Drawings</td><td>" + money(drawings) + "</td></tr>";
  html += "<tr class='total'><td>TOTAL OWNER'S EQUITY</td><td>" + money(totalEquity) + "</td></tr>";

  var totalBoth = Math.round((totalLiabilities + totalEquity) * 100) / 100;
  html += "<tr class='total'><td>TOTAL LIABILITIES AND OWNER'S EQUITY</td><td>" + money(totalBoth) + "</td></tr>";

  document.getElementById("positionTable").innerHTML = html;

  var message = document.getElementById("positionMessage");
  if (totalAssets == totalBoth) {
    message.innerHTML = "Assets = Liabilities + Owner's Equity. The statement is balanced.";
  } else {
    message.innerHTML = "The statement is NOT balanced. Please check your entries.";
  }
}

// ===== STATEMENT OF CASH FLOWS =====

// Find an account using its code
function findAccount(code) {
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].code == code) {
      return accounts[i];
    }
  }
  return null;
}

// A cash account is an Asset with "cash" in its name
function isCashAccount(account) {
  return account.type == "Asset" && account.name.toLowerCase().indexOf("cash") != -1;
}

// Check if a name contains any of the words in a list
function nameHas(name, words) {
  for (var i = 0; i < words.length; i++) {
    if (name.indexOf(words[i]) != -1) {
      return true;
    }
  }
  return false;
}

// Look at the OTHER account in a cash entry and decide the activity type
function getCashCategory(account) {
  var name = account.name.toLowerCase();

  if (account.type == "Equity") {
    return "Financing";
  }
  if (account.type == "Liability") {
    if (nameHas(name, ["loan", "note", "mortgage", "bond"])) {
      return "Financing";
    }
    return "Operating";
  }
  if (account.type == "Asset") {
    if (nameHas(name, ["equipment", "building", "land", "vehicle", "furniture", "property", "machinery"])) {
      return "Investing";
    }
    return "Operating";
  }
  return "Operating";   // Revenue and Expense accounts
}

function showCashFlow() {
  var categories = ["Operating", "Investing", "Financing"];
  var html = "<tr><th>Description</th><th>Amount</th></tr>";
  var netCash = 0;

  for (var c = 0; c < categories.length; c++) {
    var category = categories[c];
    var total = 0;
    html += "<tr class='total'><td>Cash Flows from " + category + " Activities</td><td></td></tr>";

    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var debitAccount = findAccount(e.debit);
      var creditAccount = findAccount(e.credit);
      if (debitAccount == null || creditAccount == null) {
        continue;
      }

      var amount = 0;
      var other = null;

      if (isCashAccount(debitAccount) && !isCashAccount(creditAccount)) {
        amount = e.amount;      // cash received
        other = creditAccount;
      }
      if (isCashAccount(creditAccount) && !isCashAccount(debitAccount)) {
        amount = -e.amount;     // cash paid out
        other = debitAccount;
      }

      // skip entries that do not involve cash or belong to another activity
      if (other == null || getCashCategory(other) != category) {
        continue;
      }

      html += "<tr><td>" + e.desc + "</td><td>" + money(amount) + "</td></tr>";
      total = total + amount;
    }

    total = Math.round(total * 100) / 100;
    html += "<tr class='total'><td>Net Cash from " + category + " Activities</td><td>" + money(total) + "</td></tr>";
    netCash = netCash + total;
  }

  netCash = Math.round(netCash * 100) / 100;
  html += "<tr class='total'><td>NET INCREASE (DECREASE) IN CASH</td><td>" + money(netCash) + "</td></tr>";
  html += "<tr><td>Cash at the beginning</td><td>0.00</td></tr>";
  html += "<tr class='total'><td>CASH AT THE END</td><td>" + money(netCash) + "</td></tr>";

  document.getElementById("cashTable").innerHTML = html;

  // Compare with the real cash balance
  var cashBalance = 0;
  for (var j = 0; j < accounts.length; j++) {
    if (isCashAccount(accounts[j])) {
      cashBalance = cashBalance + getBalance(accounts[j].code, "all");
    }
  }
  cashBalance = Math.round(cashBalance * 100) / 100;

  var message = document.getElementById("cashMessage");
  if (cashBalance == netCash) {
    message.innerHTML = "The ending cash matches the Cash account balance.";
  } else {
    message.innerHTML = "The ending cash does NOT match the Cash account balance (" + money(cashBalance) + "). Please check your entries.";
  }
}


// ===== DASHBOARD =====

// Show a number with commas, like 12,500.00
function formatNumber(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Add up the balances of all accounts of one type
function getTypeTotal(type) {
  var total = 0;
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].type == type) {
      total = total + getBalance(accounts[i].code, "all");
    }
  }
  return Math.round(total * 100) / 100;
}

// Capital + net income - drawings
function getOwnerEquity() {
  var capital = 0;
  var drawings = 0;
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].type == "Equity") {
      var balance = getBalance(accounts[i].code, "all");
      if (accounts[i].name.toLowerCase().indexOf("drawing") != -1) {
        drawings = drawings + balance;
      } else {
        capital = capital - balance;
      }
    }
  }
  return Math.round((capital + getNetIncome() - drawings) * 100) / 100;
}

// Make one summary card
function makeCard(label, value, color, sub) {
  var html = "<div class='card' style='border-top-color:" + color + "'>";
  html += "<div class='cardlabel'>" + label + "</div>";
  html += "<div class='cardvalue'>" + value + "</div>";
  if (sub != "") {
    html += "<div class='cardsub'>" + sub + "</div>";
  }
  html += "</div>";
  return html;
}

// Make one bar. The bar width is the value compared to the biggest value.
function makeBar(label, value, max, color) {
  var width = 0;
  if (max > 0 && value > 0) {
    width = value / max * 100;
  }
  var html = "<div class='barrow'>";
  html += "<span class='barlabel'>" + label + "</span>";
  html += "<div class='bartrack'><div class='bar' style='width:" + width + "%; background-color:" + color + "'></div></div>";
  html += "<span class='barvalue'>" + formatNumber(value) + "</span>";
  html += "</div>";
  return html;
}

function showDashboard() {
  var assets = getTypeTotal("Asset");
  var liabilities = -getTypeTotal("Liability");
  var revenue = -getTypeTotal("Revenue");
  var expenses = getTypeTotal("Expense");
  var equity = getOwnerEquity();
  var netIncome = getNetIncome();

  // cash on hand
  var cash = 0;
  for (var i = 0; i < accounts.length; i++) {
    if (isCashAccount(accounts[i])) {
      cash = cash + getBalance(accounts[i].code, "all");
    }
  }

  // count the entries
  var transactionCount = 0;
  var adjustmentCount = 0;
  for (var j = 0; j < entries.length; j++) {
    if (entries[j].kind == "adjustment") {
      adjustmentCount++;
    } else {
      transactionCount++;
    }
  }

  // summary cards
  var netLabel = "Net Income";
  var netColor = "#6FCF97";
  if (netIncome < 0) {
    netLabel = "Net Loss";
    netColor = "#FF8A80";
  }

  var cards = "";
  cards += makeCard("Total Assets", formatNumber(assets), "#5BC0BE", "");
  cards += makeCard("Total Liabilities", formatNumber(liabilities), "#F4C26B", "");
  cards += makeCard("Owner's Equity", formatNumber(equity), "#8E9BFF", "");
  cards += makeCard(netLabel, formatNumber(Math.abs(netIncome)), netColor, "");
  cards += makeCard("Cash on Hand", formatNumber(cash), "#5EC8F2", "");
  cards += makeCard("Total Entries", entries.length, "#B8C4E4", transactionCount + " transactions, " + adjustmentCount + " adjustments");
  document.getElementById("dashCards").innerHTML = cards;

  // revenue vs expenses
  var maxIncome = Math.max(revenue, expenses);
  var incomeHtml = makeBar("Revenue", revenue, maxIncome, "#6FCF97");
  incomeHtml += makeBar("Expenses", expenses, maxIncome, "#FF8A80");
  incomeHtml += "<p class='barnote'>" + netLabel + ": " + formatNumber(Math.abs(netIncome)) + "</p>";
  document.getElementById("dashIncome").innerHTML = incomeHtml;

  // accounting equation
  var maxEquation = Math.max(assets, liabilities, equity);
  var equationHtml = makeBar("Assets", assets, maxEquation, "#5BC0BE");
  equationHtml += makeBar("Liabilities", liabilities, maxEquation, "#F4C26B");
  equationHtml += makeBar("Owner's Equity", equity, maxEquation, "#8E9BFF");
  if (Math.round((assets - liabilities - equity) * 100) == 0) {
    equationHtml += "<p class='status-ok'>Assets = Liabilities + Owner's Equity. Balanced.</p>";
  } else {
    equationHtml += "<p class='status-bad'>The accounting equation is NOT balanced.</p>";
  }
  document.getElementById("dashEquation").innerHTML = equationHtml;

  // the last 5 entries (newest first)
  var recent = "<tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Amount</th><th>Type</th></tr>";
  if (entries.length == 0) {
    recent += "<tr><td colspan='6'>No entries yet.</td></tr>";
  }
  var shown = 0;
  for (var r = entries.length - 1; r >= 0 && shown < 5; r--) {
    var e = entries[r];
    var typeName = "Transaction";
    if (e.kind == "adjustment") {
      typeName = "Adjustment";
    }
    recent += "<tr>";
    recent += "<td>" + e.date + "</td>";
    recent += "<td>" + e.desc + "</td>";
    recent += "<td>" + getAccountName(e.debit) + "</td>";
    recent += "<td>" + getAccountName(e.credit) + "</td>";
    recent += "<td>" + formatNumber(e.amount) + "</td>";
    recent += "<td>" + typeName + "</td>";
    recent += "</tr>";
    shown++;
  }
  document.getElementById("dashRecent").innerHTML = recent;
}

// Update everything on the screen
function refresh() {
  fillDropdowns();
  showAccounts();
  showEntries();
  showDashboard();
}

// When the page opens
document.getElementById("tDate").value = new Date().toISOString().slice(0, 10);
document.getElementById("aDate").value = new Date().toISOString().slice(0, 10);
showPage("dashboard");
loadData();