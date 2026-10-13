$(function () {
  const $header = $(".site-header");
  const $menuButton = $(".menu-toggle");
  const $navLinks = $(".nav-links");

  function updateHeader() {
    const scrollTop = $(window).scrollTop();
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? Math.round((scrollTop / scrollableHeight) * 100) : 0;
    $header.toggleClass("scrolled", scrollTop > 12);
    $(".scroll-progress").css("transform", "scaleX(" + progress / 100 + ")")
      .attr("aria-valuenow", String(progress));
    $(".back-to-top").toggleClass("visible", scrollTop > 500);
  }

  updateHeader();
  let scrollFrame = null;
  $(window).on("scroll", function () {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(function () {
      updateHeader();
      scrollFrame = null;
    });
  });

  $menuButton.on("click", function () {
    const isOpen = $(this).attr("aria-expanded") === "true";
    $(this).attr("aria-expanded", String(!isOpen));
    $(this).attr("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    $navLinks.toggleClass("open", !isOpen);
  });

  function closeMenu() {
    $navLinks.removeClass("open");
    $menuButton.attr("aria-expanded", "false").attr("aria-label", "Open navigation menu");
  }

  $(document).on("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });
  $(document).on("click", function (event) {
    if ($navLinks.hasClass("open") && !$(event.target).closest(".navbar").length) closeMenu();
  });

  $(".nav-links a, .brand, .scroll-cue, .text-link, .process-cta a").on("click", function (event) {
    const href = $(this).attr("href");
    if (!href || href.charAt(0) !== "#") return;
    const $target = $(href);
    if (!$target.length) return;
    event.preventDefault();
    $("html, body").stop().animate({ scrollTop: $target.offset().top - $header.outerHeight() + 1 }, 550);
    closeMenu();
  });

  const navTargets = $(".nav-links .nav-link").map(function () {
    return this.hash ? document.querySelector(this.hash) : null;
  }).get().filter(Boolean);
  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const targetId = entry.target.id;
        $(".nav-links .nav-link").removeClass("active")
          .filter('[href="#' + targetId + '"]').addClass("active");
      });
    }, { rootMargin: "-20% 0px -68% 0px" });
    navTargets.forEach((target) => navObserver.observe(target));
  }

  $(".back-to-top").on("click", function () {
    $("html, body").stop().animate({ scrollTop: 0 }, 550);
    history.replaceState(null, "", window.location.pathname + window.location.search);
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

  $(".service-filter").on("click", function () {
    const filter = $(this).attr("data-filter");
    const $cards = $(".ecosystem-card");
    $(".service-filter").removeClass("active").attr("aria-pressed", "false");
    $(this).addClass("active").attr("aria-pressed", "true");

    let visibleCount = 0;
    $cards.each(function () {
      const matches = filter === "all" || $(this).attr("data-service") === filter;
      $(this).prop("hidden", !matches);
      if (matches) {
        visibleCount += 1;
        this.classList.remove("filter-enter");
        void this.offsetWidth;
        this.classList.add("filter-enter");
      } else {
        this.classList.remove("filter-enter");
      }
    });

    $(".filter-status").text(filter === "all"
      ? "Showing all " + visibleCount + " services"
      : "Showing " + visibleCount + " service");
  });

  const requestedInterest = new URLSearchParams(window.location.search).get("interest");
  const $interestField = $("#waitlist [name='interest']");
  if (requestedInterest && $interestField.find("option").filter(function () {
    return $(this).val() === requestedInterest || $(this).text() === requestedInterest;
  }).length) {
    $interestField.val(requestedInterest).trigger("change");
  }

  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });
  const $loanAmount = $("#loan-amount");
  const $interestRate = $("#interest-rate");
  const $loanTenure = $("#loan-tenure");

  function updateLoanEstimate() {
    const principal = Number($loanAmount.val());
    const annualRate = Number($interestRate.val());
    const years = Number($loanTenure.val());
    const monthlyRate = annualRate / 1200;
    const payments = years * 12;
    const monthlyPayment = monthlyRate === 0
      ? principal / payments
      : principal * monthlyRate * Math.pow(1 + monthlyRate, payments)
        / (Math.pow(1 + monthlyRate, payments) - 1);
    const totalPayment = monthlyPayment * payments;

    $("#loan-amount-value").text(currencyFormatter.format(principal));
    $("#interest-rate-value").text(annualRate + "%");
    $("#loan-tenure-value").text(years + (years === 1 ? " year" : " years"));
    $("#emi-monthly").text(currencyFormatter.format(monthlyPayment));
    $("#emi-interest").text(currencyFormatter.format(totalPayment - principal));
    $("#emi-total").text(currencyFormatter.format(totalPayment));

    [$loanAmount, $interestRate, $loanTenure].forEach(function ($input) {
      const min = Number($input.attr("min"));
      const max = Number($input.attr("max"));
      const value = Number($input.val());
      $input.css("--range-progress", ((value - min) / (max - min)) * 100 + "%");
    });
  }

  $loanAmount.add($interestRate).add($loanTenure).on("input change", updateLoanEstimate);
  updateLoanEstimate();

  $("#waitlist").on("submit", async function (event) {
    event.preventDefault();
    const $form = $(this);
    const name = $.trim($form.find('[name="name"]').val());
    const mobile = $.trim($form.find('[name="mobile"]').val()).replace(/\D/g, "");
    const email = $.trim($form.find('[name="email"]').val());
    const interest = $form.find('[name="interest"]').val();
    const city = $.trim($form.find('[name="city"]').val());
    const values = [
      [$form.find('[name="name"]'), name.length >= 2],
      [$form.find('[name="mobile"]'), mobile.length === 10],
      [$form.find('[name="email"]'), /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)],
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
      $message.text("Please enter a valid name, email, 10-digit mobile number, interest and city.");
      $message.css("color", "#ffb3a8");
      firstInvalid.trigger("focus");
      return;
    }

    const $submit = $form.find(".form-submit");
    const originalButton = $submit.html();
    $submit.text("Sending...").prop("disabled", true);
    $message.empty().css("color", "");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, email, interest, city })
      });
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error("The registration server returned an invalid response. Check that the backend is running locally or the Cloudflare Pages Function has been deployed.");
      }
      if (!response.ok) {
        throw new Error(result.error || "We couldn't submit your registration.");
      }
      if (typeof result.message !== "string") {
        throw new Error("The registration server returned an unexpected response. Please try again.");
      }
      $message.css("color", "#7ee2b7").text(result.message);
      $submit.text("You're on the list!");
    } catch (error) {
      $message.css("color", "#ffb3a8").text(
        error instanceof Error ? error.message : "We couldn't submit your registration. Please try again."
      );
      $submit.html(originalButton).prop("disabled", false);
    }
  });

  $("#waitlist input, #waitlist select").on("input change", function () {
    $(this).removeClass("invalid").attr("aria-invalid", "false");
    const $form = $("#waitlist");
    $form.find(".form-message").empty().css("color", "");
  });
});
