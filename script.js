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