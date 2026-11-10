/* Store Management System - front-end behaviour */

(function () {
  "use strict";

  // Confirm before destructive actions.
  document.querySelectorAll("form[data-confirm]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      if (!window.confirm(form.getAttribute("data-confirm"))) {
        event.preventDefault();
      }
    });
  });

  // Sale builder -------------------------------------------------------------
  var table = document.getElementById("sale-rows");
  if (!table) return;

  var dataNode = document.getElementById("product-data");
  var products = dataNode ? JSON.parse(dataNode.textContent) : [];
  products = products.filter(function (product) {
    return product.stock_qty > 0;
  });

  var form = document.getElementById("sale-form");
  var itemsInput = document.getElementById("items-input");
  var discountInput = document.getElementById("discount");
  var taxInput = document.getElementById("tax-rate");
  var addButton = document.getElementById("add-row");

  function money(value) {
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  function buildProductSelect(selectedId) {
    var select = document.createElement("select");
    select.className = "product-select";
    select.required = true;

    var blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— choose product —";
    select.appendChild(blank);

    products.forEach(function (product) {
      var option = document.createElement("option");
      option.value = product.id;
      option.textContent = product.name + " (" + product.stock_qty + " " + product.unit + ")";
      option.dataset.price = product.sell_price;
      option.dataset.stock = product.stock_qty;
      option.dataset.unit = product.unit;
      if (String(product.id) === String(selectedId)) option.selected = true;
      select.appendChild(option);
    });
    return select;
  }

  function addRow(preset) {
    preset = preset || {};
    var row = document.createElement("tr");
    row.className = "sale-row";

    var productCell = document.createElement("td");
    var select = buildProductSelect(preset.product_id);
    productCell.appendChild(select);

    var qtyCell = document.createElement("td");
    var qty = document.createElement("input");
    qty.type = "number";
    qty.className = "qty-input";
    qty.min = "1";
    qty.step = "1";
    qty.value = preset.qty || 1;
    qtyCell.appendChild(qty);

    var priceCell = document.createElement("td");
    var price = document.createElement("input");
    price.type = "number";
    price.className = "price-input";
    price.min = "0";
    price.step = "0.01";
    price.value = preset.unit_price != null ? preset.unit_price : "";
    priceCell.appendChild(price);

    var totalCell = document.createElement("td");
    totalCell.className = "right line-total";
    totalCell.textContent = "0.00";

    var actionCell = document.createElement("td");
    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn-icon";
    remove.innerHTML = "&times;";
    remove.title = "Remove line";
    actionCell.appendChild(remove);

    row.appendChild(productCell);
    row.appendChild(qtyCell);
    row.appendChild(priceCell);
    row.appendChild(totalCell);
    row.appendChild(actionCell);
    table.appendChild(row);

    function syncPrice() {
      var option = select.options[select.selectedIndex];
      if (option && option.dataset.price && !price.dataset.touched) {
        price.value = Number(option.dataset.price).toFixed(2);
      }
      recalc();
    }

    select.addEventListener("change", function () {
      delete price.dataset.touched;
      syncPrice();
    });
    price.addEventListener("input", function () {
      price.dataset.touched = "1";
      recalc();
    });
    qty.addEventListener("input", recalc);
    remove.addEventListener("click", function () {
      row.remove();
      if (!table.querySelector(".sale-row")) addRow();
      recalc();
    });

    syncPrice();
    return row;
  }

  function rows() {
    return Array.prototype.slice.call(table.querySelectorAll(".sale-row"));
  }

  function collect() {
    var items = [];
    rows().forEach(function (row) {
      var select = row.querySelector(".product-select");
      var qty = parseInt(row.querySelector(".qty-input").value, 10);
      var price = parseFloat(row.querySelector(".price-input").value);
      if (!select.value || !qty || qty < 1 || isNaN(price) || price < 0) return;

      var option = select.options[select.selectedIndex];
      var stock = parseInt(option.dataset.stock, 10);
      if (qty > stock) {
        qty = stock;
        row.querySelector(".qty-input").value = stock;
      }
      items.push({
        product_id: parseInt(select.value, 10),
        qty: qty,
        unit_price: price
      });
    });
    return items;
  }

  function recalc() {
    var subtotal = 0;
    rows().forEach(function (row) {
      var qty = parseInt(row.querySelector(".qty-input").value, 10) || 0;
      var price = parseFloat(row.querySelector(".price-input").value) || 0;
      var line = qty * price;
      subtotal += line;
      row.querySelector(".line-total").textContent = money(line);
    });

    var discount = parseFloat(discountInput.value) || 0;
    if (discount > subtotal) {
      discount = subtotal;
      discountInput.value = money(discount);
    }
    var taxRate = parseFloat(taxInput.value) || 0;
    var taxable = Math.max(subtotal - discount, 0);
    var tax = taxable * taxRate / 100;

    document.getElementById("subtotal").textContent = money(subtotal);
    document.getElementById("discount-out").textContent = money(discount);
    document.getElementById("tax-out").textContent = money(tax);
    document.getElementById("grand-total").textContent = money(taxable + tax);
  }

  if (addButton) {
    addButton.addEventListener("click", function () {
      addRow();
    });
  }
  discountInput.addEventListener("input", recalc);
  taxInput.addEventListener("input", recalc);

  if (form) {
    form.addEventListener("submit", function (event) {
      var items = collect();
      if (!items.length) {
        event.preventDefault();
        window.alert("Add at least one product with a quantity before saving.");
        return;
      }
      itemsInput.value = JSON.stringify(items);
    });
  }

  addRow();
  recalc();
})();
