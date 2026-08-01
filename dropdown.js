// A dropdown we draw ourselves.
//
// The browser's own <select> and <datalist> cannot be styled -- the list that
// opens belongs to the operating system, not the page. So the list here is
// plain divs, which means the keyboard handling is ours to write too.
//
// Two shapes, same component:
//   editable: true   type to filter, used for player names
//   editable: false  click to open the whole list, used for seasons

function createDropdown(host, options) {
  var editable = options.editable;
  var placeholder = options.placeholder || "";
  var minChars = options.minChars || 0;
  var maxVisible = options.maxVisible || 20;
  var onSelect = options.onSelect || function () {};

  var items = []; // { value, label }
  var shown = [];
  var active = -1;
  var open = false;
  var value = "";

  host.className = "combo";

  var field = document.createElement(editable ? "input" : "button");
  field.className = "combo-field";
  if (editable) {
    field.type = "text";
    field.placeholder = placeholder;
    field.autocomplete = "off";
  } else {
    field.type = "button";
    field.textContent = placeholder;
  }
  host.appendChild(field);

  var list = document.createElement("div");
  list.className = "combo-list";
  list.hidden = true;
  host.appendChild(list);

  function labelFor(v) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].value === v) return items[i].label;
    }
    return "";
  }

  function paintField() {
    if (editable) return;
    field.textContent = value ? labelFor(value) : placeholder;
    field.classList.toggle("is-empty", !value);
  }

  // Typing "jorda" has to reach Michael Jordan. Alphabetically he is 24th of
  // 31 matches, behind Adonis Jordan and Jordan Bone, so a plain filter with a
  // cut-off loses him. Names that start a word come first, and within each
  // group the caller's order wins -- items arrive sorted by career length, so
  // the player you meant is near the top.
  function matches() {
    if (!editable) return items;

    var typed = field.value.trim().toLowerCase();
    if (field.value.length < minChars || typed === "") return [];

    var starts = [];
    var contains = [];

    items.forEach(function (item) {
      var label = item.label.toLowerCase();
      var at = label.indexOf(typed);
      if (at === -1) return;

      if (at === 0 || label.charAt(at - 1) === " ") starts.push(item);
      else contains.push(item);
    });

    return starts.concat(contains).slice(0, maxVisible);
  }

  function paintList() {
    list.innerHTML = "";

    shown.forEach(function (item, index) {
      var option = document.createElement("div");
      option.className = "combo-option";
      if (index === active) option.classList.add("is-active");
      if (item.value === value) option.classList.add("is-chosen");
      option.textContent = item.label;

      // mousedown, not click: the field would lose focus first and close us.
      option.addEventListener("mousedown", function (event) {
        event.preventDefault();
        choose(index);
      });
      option.addEventListener("mouseenter", function () {
        active = index;
        paintList();
      });

      list.appendChild(option);
    });
  }

  function show() {
    shown = matches();
    if (!shown.length) return hide();

    // Reopening on the current value should land on it, not at the top.
    active = 0;
    for (var i = 0; i < shown.length; i++) {
      if (shown[i].value === value) active = i;
    }

    open = true;
    list.hidden = false;
    host.classList.add("is-open");
    paintList();
    scrollToActive();
  }

  function hide() {
    open = false;
    list.hidden = true;
    host.classList.remove("is-open");
  }

  function scrollToActive() {
    var option = list.children[active];
    if (!option) return;
    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop;
    } else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }

  function move(step) {
    if (!open) return show();
    active = (active + step + shown.length) % shown.length;
    paintList();
    scrollToActive();
  }

  function choose(index) {
    var item = shown[index];
    if (!item) return;

    value = item.value;
    if (editable) field.value = item.label;
    paintField();
    hide();
    onSelect(value);
  }

  field.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      if (open) {
        event.preventDefault();
        choose(active);
      }
    } else if (event.key === "Escape") {
      hide();
    }
  });

  if (editable) {
    field.addEventListener("input", function () {
      value = "";
      show();
    });
    field.addEventListener("blur", hide);
  } else {
    field.addEventListener("click", function () {
      if (open) hide();
      else show();
    });
    field.addEventListener("blur", hide);
  }

  return {
    setItems: function (list_) {
      items = list_;
      if (!editable) {
        // A fresh list means the old pick is meaningless.
        value = "";
        paintField();
      }
      hide();
    },
    getValue: function () {
      return value;
    },
    setValue: function (v) {
      value = v;
      if (editable) field.value = labelFor(v);
      paintField();
    },
    disable: function (off) {
      field.disabled = off;
      host.classList.toggle("is-disabled", off);
    },
  };
}
