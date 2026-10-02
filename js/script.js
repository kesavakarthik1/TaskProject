$(function () {
  const $header = $(".site-header");
  const $menuButton = $(".menu-toggle");
  const $navLinks = $(".nav-links");

  function updateHeader() {
    $header.toggleClass("scrolled", $(window).scrollTop() > 12);
  }

  updateHeader();
  $(window).on("scroll", updateHeader);

  $menuButton.on("click", function () {
    const isOpen = $(this).attr("aria-expanded") === "true";
    $(this).attr("aria-expanded", String(!isOpen));
    $(this).attr("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    $navLinks.toggleClass("open", !isOpen);
  });

  $(".nav-links a, .brand, .scroll-cue, .text-link, .process-cta a").on("click", function (event) {
    const href = $(this).attr("href");
    if (!href || href.charAt(0) !== "#") return;
    const $target = $(href);
    if (!$target.length) return;
    event.preventDefault();
    $("html, body").stop().animate({ scrollTop: $target.offset().top - $header.outerHeight() + 1 }, 550);
    $navLinks.removeClass("open");
    $menuButton.attr("aria-expanded", "false").attr("aria-label", "Open navigation menu");
  });

  $(".button-gold, .button-navy, .button-outline").on("click", function () {
    $(this).addClass("button-pressed");
    window.setTimeout(() => $(this).removeClass("button-pressed"), 220);
  });

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function (entries, activeObserver) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  $("#waitlist").on("submit", function (event) {
    event.preventDefault();
    const $form = $(this);
    const name = $.trim($form.find('[name="name"]').val());
    const mobile = $.trim($form.find('[name="mobile"]').val()).replace(/\D/g, "");
    const interest = $form.find('[name="interest"]').val();
    const city = $.trim($form.find('[name="city"]').val());
    const values = [
      [$form.find('[name="name"]'), name.length >= 2],
      [$form.find('[name="mobile"]'), mobile.length === 10],
      [$form.find('[name="interest"]'), Boolean(interest)],
      [$form.find('[name="city"]'), city.length >= 2]
    ];
    let firstInvalid = null;
    values.forEach(function ([ $field, valid ]) {
      $field.toggleClass("invalid", !valid).attr("aria-invalid", String(!valid));
      if (!valid && !firstInvalid) firstInvalid = $field;
    });
    const $message = $form.find(".form-message");
    if (firstInvalid) {
      $message.text("Please enter a valid name, 10-digit mobile number, interest and city.");
      $message.css("color", "#ffb3a8");
      firstInvalid.trigger("focus");
      return;
    }
    $message.css("color", "#7ee2b7").text("You're on the list, " + name.split(/\s+/)[0] + "! We'll be in touch soon.");
    $form.find(".form-submit").text("You're on the list!").prop("disabled", true);
  });

  $("#waitlist input, #waitlist select").on("input change", function () {
    $(this).removeClass("invalid").attr("aria-invalid", "false");
    $("#waitlist .form-message").empty().css("color", "");
  });
});
