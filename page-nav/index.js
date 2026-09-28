(function () {
  "use strict";

  var menu = document.getElementById("menu");
  var leftPanel = document.getElementById("left-panel");
  var mainNav = document.getElementById("main-nav");
  var rightTitle = document.getElementById("right-title");
  var subNav = document.getElementById("sub-nav");

  var menuData = [];
  var currentIndex = -1;

  // 自定义提示框（替代系统原生 title）
  var tooltip = document.createElement("div");
  tooltip.className = "nav-tooltip";
  tooltip.style.position = "absolute";
  tooltip.style.display = "none";
  tooltip.style.zIndex = "1000";
  var tooltipBody = document.createElement("div");
  tooltipBody.className = "nav-tooltip-body";
  tooltip.appendChild(tooltipBody);
  document.body.appendChild(tooltip);

  // 预留属性，避免未设置时出现宽高跳动
  var TOOLTIP_GAP = 10; // 与触发元素的间距
  var TOOLTIP_MARGIN = 8; // 距视口边缘的最小间距

  var hoverAnchor = false;
  var hoverTip = false;
  var hideTimer = null;

  function bindTooltip(el, text) {
    el.addEventListener("mouseenter", function () {
      hoverAnchor = true;
      showTooltip(el, text);
    });
    el.addEventListener("mouseleave", function () {
      hoverAnchor = false;
      scheduleHide();
    });
  }

  // 鼠标从元素移到提示框上时可继续悬停（用于内部滚动）
  tooltip.addEventListener("mouseenter", function () {
    hoverTip = true;
  });
  tooltip.addEventListener("mouseleave", function () {
    hoverTip = false;
    scheduleHide();
  });
  tooltip.addEventListener("mousemove", function () {
    hoverTip = true;
  });

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (!hoverAnchor && !hoverTip) hideTooltip();
    }, 80);
  }

  function showTooltip(anchor, text) {
    if (!text) return;
    tooltipBody.textContent = text;
    tooltip.style.display = "block";

    var anchorRect = anchor.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var winWidth = window.innerWidth;
    var winHeight = window.innerHeight;

    // 默认显示在元素下方居左；计算水平位置并夹取在视口内
    var left = anchorRect.left;
    var maxLeft = winWidth - tipRect.width - TOOLTIP_MARGIN;
    if (left > maxLeft) left = maxLeft;
    if (left < TOOLTIP_MARGIN) left = TOOLTIP_MARGIN;

    var top = anchorRect.bottom + TOOLTIP_GAP;
    var maxTop = winHeight - tipRect.height - TOOLTIP_MARGIN;
    if (top > maxTop) {
      // 下方放不下则放到上方，箭头翻转
      top = anchorRect.top - tipRect.height - TOOLTIP_GAP;
      tooltip.classList.add("flipped");
      if (top < TOOLTIP_MARGIN) top = TOOLTIP_MARGIN;
    } else {
      tooltip.classList.remove("flipped");
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    hoverAnchor = false;
    hoverTip = false;
    tooltip.style.display = "none";
    tooltipBody.textContent = "";
    tooltip.classList.remove("flipped");
  }

  window.addEventListener("resize", hideTooltip);

  // ===== 折叠 / 展开 =====
  function toggleCollapse() {
    menu.classList.toggle("collapsed");
    setCollapsedState(menu.classList.contains("collapsed"));
  }

  // 顶部和底部按钮保持一致状态
  function setCollapsedState(collapsed) {
    Array.prototype.forEach.call(
      leftPanel.querySelectorAll(".collapse-btn"),
      function (btn) {
        var action = collapsed ? "展开" : "折叠";
        var icon = collapsed ? "▶" : "◀";
        btn.textContent = icon + " " + action;
        btn.title = action + "面板";
      }
    );
  }

  Array.prototype.forEach.call(
    leftPanel.querySelectorAll(".collapse-btn"),
    function (btn) {
      btn.addEventListener("click", toggleCollapse);
    }
  );

  // ===== 渲染主导航 =====
  function renderMainNav() {
    mainNav.innerHTML = "";
    menuData.forEach(function (item, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "main-item" + (index === currentIndex ? " active" : "");
      btn.textContent = item.name;
      btn.title = item.name;
      btn.addEventListener("click", function () {
        selectIndex(index);
      });
      mainNav.appendChild(btn);
    });
  }

  // 应用某个导航选中状态（不含 URL 操作）
  function applySelection(index) {
    currentIndex = index;
    var items = mainNav.querySelectorAll(".main-item");
    Array.prototype.forEach.call(items, function (btn, i) {
      btn.classList.toggle("active", i === index);
    });
    renderRight();
  }

  // 从 hash 解析目标序号，归一化后选中对应导航
  function applyFromHash() {
    if (menuData.length === 0) return;
    var target = readTargetIndex();
    if (target < 0 || target >= menuData.length) {
      target = 0;
    }
    if (target !== currentIndex) {
      applySelection(target);
    }
  }

  // 读取 hash(#/N) 得到 0 基导航下标；无有效数字返回 -1
  function readTargetIndex() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    var m = hash.match(/^\/?(\d+)/);
    if (m) {
      return parseInt(m[1], 10) - 1;
    }
    return -1;
  }

  // 监听 hash 变化：点击导航、浏览器前进/后退、手动改 hash 都会触发
  window.addEventListener("hashchange", applyFromHash);

  // 选择导航：写入 hash(#/N)，由 hashchange 统一处理选中态
  function selectIndex(index) {
    if (index < 0 || index === currentIndex) {
      return;
    }
    var hash = "#/" + (index + 1);
    if (window.location.hash !== hash) {
      window.location.hash = hash; // 触发 hashchange → applyFromHash
    } else {
      applySelection(index); // hash 相同则不触发事件，直接应用
    }
  }

  // ===== 渲染右侧子级内容 =====
  function renderRight() {
    subNav.innerHTML = "";
    rightTitle.textContent = "";

    var data = currentIndex >= 0 ? menuData[currentIndex] : null;
    if (!data) {
      rightTitle.textContent = "页面导航";
      var tip = document.createElement("p");
      tip.className = "empty-tip";
      tip.textContent = "请选择左侧导航。";
      subNav.appendChild(tip);
      return;
    }

    rightTitle.textContent = data.name;

    var groups = Array.isArray(data.children) ? data.children : [];
    if (groups.length === 0) {
      var tip = document.createElement("p");
      tip.className = "empty-tip";
      tip.textContent = "该导航暂无子级内容。";
      subNav.appendChild(tip);
      return;
    }

    groups.forEach(function (links, groupIndex) {
      if (!Array.isArray(links) || links.length === 0) return;

      var group = document.createElement("section");
      group.className = "sub-group";

      var title = document.createElement("h3");
      title.className = "sub-group-title";
      title.textContent = "第 " + (groupIndex + 1) + " 组";

      var list = document.createElement("div");
      list.className = "sub-links";

      links.forEach(function (link, i) {
        if (!link) return;
        var a = document.createElement("a");
        a.className = "sub-link";
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        var badge = document.createElement("span");
        badge.className = "item-index";
        badge.textContent = i + 1; // 组内从 1 开始编号
        a.appendChild(badge);

        a.appendChild(document.createTextNode(link.name));
        bindTooltip(a, link.tips || link.name || "");
        list.appendChild(a);
      });

      group.appendChild(title);
      group.appendChild(list);
      subNav.appendChild(group);
    });
  }

  // ===== 初始化 =====
  function loadMenuData() {
    fetch("./menu.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        menuData = data || [];
        renderMainNav();
        if (menuData.length > 0) {
          // 若 hash 无有效序号，则默认定位第 1 个导航并写入 hash(#/1)
          if (readTargetIndex() < 0) {
            window.location.hash = "#/1";
          }
          applyFromHash();
        } else {
          renderRight();
        }
      })
      .catch(function (err) {
        mainNav.innerHTML = "";
        rightTitle.textContent = "页面导航";
        var tip = document.createElement("p");
        tip.className = "empty-tip";
        tip.textContent = "菜单数据加载失败：" + err.message;
        subNav.appendChild(tip);
      });
  }

  loadMenuData();
})();
