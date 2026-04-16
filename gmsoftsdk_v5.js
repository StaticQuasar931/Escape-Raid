(function() {
  if (window.__escapeRaidGmsoftInstalled) {
    return;
  }
  window.__escapeRaidGmsoftInstalled = true;

  var sdkUrlPatterns = [
    /ajax\/infov3/i,
    /api\.azgame\.io\/sdk\/gmadsv1/i,
    /games\.yoplay\.io\/sdk\/gmadsv1/i,
    /api\.cdnwave\.com\/sdkdom\/gamesdk/i,
    /lib\/infov3\.json/i
  ];

  function noop() {}

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function safeJsonStringify(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return "{}";
    }
  }

  function matchesSdkUrl(url) {
    return typeof url === "string" && sdkUrlPatterns.some(function(pattern) {
      return pattern.test(url);
    });
  }

  function decodeBase64Json(value) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(value))));
    } catch (error) {
      return null;
    }
  }

  function installFirebaseStubs() {
    window.firebaseLogEvent = window.firebaseLogEvent || noop;
    window.firebaseLogEventParameter = window.firebaseLogEventParameter || noop;
    window.firebaseSetUserProperties = window.firebaseSetUserProperties || noop;
  }

  function installAdsStubs() {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adConfig = window.adConfig || function(options) {
      if (options && typeof options.onReady === "function") {
        setTimeout(options.onReady, 0);
      }
    };
    window.adBreak = window.adBreak || function(options) {
      if (options && typeof options.beforeAd === "function") {
        options.beforeAd();
      }
      if (options && typeof options.afterAd === "function") {
        options.afterAd();
      }
      if (options && typeof options.adBreakDone === "function") {
        options.adBreakDone();
      }
    };
    window._showRewardAdFn = null;
    window.afg = window.afg || {
      ready: true,
      onBeforeAd: noop,
      onAfterAd: noop
    };
  }

  function installLegacyGlobals(gameInfoParam, adInfoParam) {
    function runCallback(callbackFunction) {
      if (typeof callbackFunction === "function") {
        callbackFunction();
      }
    }

    window.gmEvent = window.gmEvent || noop;
    window.gmStartGame = window.gmStartGame || runCallback;
    window.gmStartAds = window.gmStartAds || runCallback;
    window.SetSDKType = window.SetSDKType || noop;
    window.GMGameSDK = window.GMGameSDK || {
      init: function() {
        return {
          setVersion: function() {
            return this;
          }
        };
      },
      trackEvent: noop,
      trackEventParams: noop
    };

    window.GMSDK = window.GMSDK || {};
    window.GMSDK.SetSDKType = window.GMSDK.SetSDKType || window.SetSDKType;
    window.GMSDK.SetGameInfoParam = window.GMSDK.SetGameInfoParam || function(param) {
      if (typeof param !== "undefined") {
        window.__escapeRaidGameInfoParam = param;
      }
      return window.__escapeRaidGameInfoParam || gameInfoParam || "";
    };

    window.GMAdvertisementManager = window.GMAdvertisementManager || {};
    window.GMAdvertisementManager.SetAdParam = window.GMAdvertisementManager.SetAdParam || function(param) {
      if (typeof param !== "undefined") {
        window.__escapeRaidAdInfoParam = param;
      }
      return window.__escapeRaidAdInfoParam || adInfoParam || "";
    };

    window.GMAnalytics = window.GMAnalytics || {
      LogEvent: noop
    };

    window.GmSoft = window.GmSoft || {};
    window.GmSoft.Init = window.GmSoft.Init || function() {
      return true;
    };
    window.GmSoft.Ready = window.GmSoft.Ready || function() {
      return true;
    };
    window.GmSoft.SetParam = window.GmSoft.SetParam || function(param) {
      if (typeof param === "string" && param) {
        window.__escapeRaidLastParam = param;
      }
      return true;
    };
    window.GmSoft.GetParam = window.GmSoft.GetParam || function(key) {
      if (key === "allow_play") {
        return "yes";
      }
      if (key === "sdkType") {
        return "gm";
      }
      return "";
    };
    window.GmSoft.Event = window.GmSoft.Event || noop;
    window.SetParam = window.SetParam || window.GmSoft.SetParam;
  }

  function installNetworkShim(getPayloadText, getSiteInfoText) {
    if (window.__escapeRaidGmsoftNetworkInstalled) {
      return;
    }
    window.__escapeRaidGmsoftNetworkInstalled = true;

    var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
    if (nativeFetch) {
      window.fetch = function(resource, init) {
        var url = typeof resource === "string" ? resource : resource && resource.url;
        if (matchesSdkUrl(url)) {
          var body = /infov3\.json|ajax\/infov3/i.test(url) ? getSiteInfoText() : getPayloadText();
          return Promise.resolve(new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return nativeFetch(resource, init);
      };
    }

    var nativeOpen = XMLHttpRequest.prototype.open;
    var nativeSend = XMLHttpRequest.prototype.send;
    var nativeSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    var nativeGetResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
    var nativeGetAllResponseHeaders = XMLHttpRequest.prototype.getAllResponseHeaders;

    XMLHttpRequest.prototype.open = function(method, url) {
      this.__escapeRaidIntercept = matchesSdkUrl(typeof url === "string" ? url : "");
      this.__escapeRaidInterceptUrl = typeof url === "string" ? url : "";
      if (!this.__escapeRaidIntercept) {
        return nativeOpen.apply(this, arguments);
      }
      this.readyState = 1;
      if (typeof this.onreadystatechange === "function") {
        this.onreadystatechange();
      }
    };

    XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
      if (!this.__escapeRaidIntercept) {
        return nativeSetRequestHeader.call(this, name, value);
      }
    };

    XMLHttpRequest.prototype.send = function() {
      if (!this.__escapeRaidIntercept) {
        return nativeSend.apply(this, arguments);
      }

      var payload = /infov3\.json|ajax\/infov3/i.test(this.__escapeRaidInterceptUrl)
        ? getSiteInfoText()
        : getPayloadText();

      Object.defineProperty(this, "readyState", { configurable: true, value: 4 });
      Object.defineProperty(this, "status", { configurable: true, value: 200 });
      Object.defineProperty(this, "statusText", { configurable: true, value: "OK" });
      Object.defineProperty(this, "responseText", { configurable: true, value: payload });
      Object.defineProperty(this, "response", { configurable: true, value: payload });

      if (typeof this.onreadystatechange === "function") {
        this.onreadystatechange();
      }
      if (typeof this.onload === "function") {
        this.onload();
      }
      if (typeof this.onloadend === "function") {
        this.onloadend();
      }
    };

    XMLHttpRequest.prototype.getResponseHeader = function(name) {
      if (this.__escapeRaidIntercept) {
        return name && name.toLowerCase() === "content-type" ? "application/json" : null;
      }
      return nativeGetResponseHeader.call(this, name);
    };

    XMLHttpRequest.prototype.getAllResponseHeaders = function() {
      if (this.__escapeRaidIntercept) {
        return "content-type: application/json\r\n";
      }
      return nativeGetAllResponseHeaders.call(this);
    };
  }

  function isDiffHost() {
    try {
      if (window.top && window === window.top) {
        return false;
      }
      if (window.top.location.hostname === window.location.hostname) {
        return false;
      }
    } catch (error) {
      return true;
    }
    return true;
  }

  function isHostOnGDSDK() {
    var parts = window.location.hostname.split(".");
    return parts.slice(-2).join(".") === "gamedistribution.com";
  }

  function httpGet(url) {
    if (matchesSdkUrl(url)) {
      if (/infov3\.json|ajax\/infov3/i.test(url)) {
        return safeJsonStringify(window.__ESCAPE_RAID_SITE_INFO || {});
      }
      return safeJsonStringify(window.__ESCAPE_RAID_GMSOFT_RESPONSE || {});
    }
    var request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send("");
    return request.responseText;
  }

  function dispatchReady() {
    document.dispatchEvent(new CustomEvent("gmsoftSdkReady"));
    window.dispatchEvent(new Event("gmsoftSdkReady"));
  }

  function pinUnlockState(options, siteInfo, gameInfo, adsInfo) {
    if (window.__escapeRaidUnlockInterval) {
      clearInterval(window.__escapeRaidUnlockInterval);
    }
    window.__escapeRaidUnlockInterval = setInterval(function() {
      window.GMSOFT_SDKTYPE = "gm";
      window.sdkType = "gm";
      window.GMSOFT_SIGNED = options.signedDomainToken;

      if (!window.GMSOFT_OPTIONS) {
        window.GMSOFT_OPTIONS = {};
      }

      window.GMSOFT_OPTIONS.allow_play = "yes";
      window.GMSOFT_OPTIONS.allow_host = "yes";
      window.GMSOFT_OPTIONS.allow_embed = "yes";
      window.GMSOFT_OPTIONS.enableAds = false;
      window.GMSOFT_OPTIONS.enablePromotion = false;
      window.GMSOFT_OPTIONS.enablePreroll = false;
      window.GMSOFT_OPTIONS.sdkType = "gm";
      window.GMSOFT_OPTIONS.sdkversion = 5;
      window.GMSOFT_OPTIONS.game = siteInfo.game;
      window.GMSOFT_OPTIONS.promotion = siteInfo.promotion || {};
      window.GMSOFT_OPTIONS.domainHost = window.location.hostname;

      window.GMSOFT_GAME_INFO = gameInfo;
      window.GMSOFT_ADS_INFO = adsInfo;

      try {
        localStorage.setItem("gmsdksigndomain", options.signedDomainToken);
        localStorage.setItem("gmsoft_options", safeJsonStringify(window.GMSOFT_OPTIONS));
        localStorage.setItem("gmsoft_game", safeJsonStringify(siteInfo.game || {}));
      } catch (error) {}
    }, 250);
  }

  function bootstrap() {
    var input = window.__ESCAPE_RAID_GMSOFT_INPUT;
    if (!input) {
      setTimeout(bootstrap, 25);
      return;
    }

    if (window.__escapeRaidGmsoftBootstrapped) {
      return;
    }
    window.__escapeRaidGmsoftBootstrapped = true;

    installFirebaseStubs();
    installAdsStubs();
    installLegacyGlobals(input.gameInfoParam, input.adInfoParam);

    var config = input.config || window.config || {};
    var signedData = decodeBase64Json(input.signedDomainToken) || {};
    var verifiedSignature = signedData.signed || "";
    var hostName = window.location.hostname;
    var allowList = Array.from(new Set([
      hostName,
      "localhost",
      "127.0.0.1",
      "staticquasar931.github.io",
      "game.azgame.io",
      "games.azgame.io",
      "azgame.io"
    ]));

    config.gdHost = isHostOnGDSDK();
    window.GMDEBUG = window.GMDEBUG || {};
    window.GMDEBUG["LOADED SDK"] = Date.now();
    window.GMSOFT_OPTIONS = config;
    window.GMSOFT_OPTIONS.enableAds = false;
    window.GMSOFT_OPTIONS.debug = false;
    window.GMSOFT_OPTIONS.pub_id = "";
    window.GMSOFT_OPTIONS.unlockTimer = 0;
    window.GMSOFT_OPTIONS.timeShowInter = 60;
    window.GMSOFT_OPTIONS.timeShowReward = 60;
    window.GMSOFT_OPTIONS.domainHost = hostName;
    window.GMSOFT_OPTIONS.sourceHtml = "RHhrUUVRZGJid2xHVUFnV0IwY01HeE1FQ2doS0NCdE9MRTlESGdJZUJ3WUxGUWNCRERJU1ZGb0xNdz09";
    window.GMSOFT_OPTIONS.sdkversion = 5;
    window.GMSOFT_OPTIONS.adsDebug = false;
    window.GMSOFT_OPTIONS.game = null;
    window.GMSOFT_OPTIONS.promotion = null;
    window.GMSOFT_OPTIONS.allow_play = "yes";
    window.GMSOFT_OPTIONS.allow_host = "yes";
    window.GMSOFT_OPTIONS.allow_embed = "yes";
    window.GMSOFT_OPTIONS.enablePromotion = false;
    window.GMSOFT_OPTIONS.enablePreroll = false;
    window.GMSOFT_OPTIONS.sdkType = "gm";

    var siteInfo = Object.assign({
      enable_ads: "no",
      hostindex: 0,
      adsDebug: "no",
      debug_mode: "no",
      promotion: {
        enable: "no",
        call_to_action: "no",
        promotion_list: []
      },
      unlock_timer: 0,
      unlock_time: 0,
      enablePreroll: "no",
      pub_id: "",
      timeShowInter: 60,
      timeShowReward: 60,
      sdkType: "gm",
      allow_embed: "yes",
      allow_host: "yes",
      allow_play: "yes",
      allowLocalHost: true,
      game: {
        name: "Escape Raid",
        description: "",
        image: "loading.png",
        redirect_url: ""
      }
    }, input.siteInfo || {});

    var gameInfo = {
      sdktype: "gm",
      more_games_url: "",
      promotion: siteInfo.promotion || {}
    };

    var adsInfo = {
      enable: "no",
      sdk_type: "gm",
      time_show_inter: 60,
      time_show_reward: 60,
      pubid: "",
      reward: "no",
      gd_game_key: "",
      wgLibrary: "",
      wgConf: ""
    };

    var responseBody = Object.assign({
      success: true,
      status: "success",
      message: "ok",
      sdk_type: "gm",
      allow_play: true,
      allow: true,
      allowPlay: true,
      block: false,
      blocked: false,
      locked: false,
      hosted: true,
      game: "escape-raid",
      gameid: "escape-raid",
      gameId: "escape-raid",
      gameName: "Escape Raid",
      gd_game_key: "escape-raid-az",
      more_games_url: "",
      hosts: allowList,
      allowedHost: hostName,
      allowedHosts: allowList,
      sitelockVersion: 2,
      allowLocalHost: true,
      allow_embed: "yes",
      allow_host: "yes",
      enable_ads: "no",
      adsDebug: "no",
      timeShowInter: 60,
      timeShowReward: 60,
      version: config.productVersion || "25091906",
      title: "Escape Raid",
      regisinfo: {
        allow_play: "yes",
        unlock_timer: "0",
        name: "Escape Raid",
        description: "",
        image: "loading.png",
        redirect_url: "",
        signed: input.signedDomainToken,
        domain: hostName,
        host: hostName,
        allow_host: "yes",
        allow_embed: "yes"
      },
      adsinfo: {
        enable: "no",
        ads_debug: "no",
        ads_code: "",
        time_show_inter: 0,
        time_show_reward: 0,
        sdk_type: "gm",
        enable_preroll: "no",
        enable_reward: "no",
        enable_interstitial: "no"
      },
      gameinfo: {
        moregames_url: "",
        enable_moregame: "no",
        promotion: siteInfo.promotion || {
          enable: "no",
          call_to_action: "no",
          promotion_list: []
        },
        redirect_url: "",
        veryfiedDomainData: {
          whiteListDomain: allowList,
          veryfiedSignature: verifiedSignature,
          domain: hostName,
          host: hostName
        }
      },
      gameInfoParam: input.gameInfoParam,
      adParam: input.adInfoParam,
      data: input.gameInfoParam,
      game_info: input.gameInfoParam,
      ad_info: input.adInfoParam,
      config: input.gameInfoObject,
      gameInfo: input.gameInfoObject,
      result: {
        success: true,
        data: input.gameInfoParam,
        adData: input.adInfoParam
      }
    }, input.responseBody || {});

    window.__ESCAPE_RAID_SITE_INFO = siteInfo;
    window.__ESCAPE_RAID_GMSOFT_RESPONSE = responseBody;
    window.GMDEBUG.LOADED_SDK_SUCCESS = Date.now();
    window.GMSOFT_MSG = safeJsonStringify(siteInfo);
    window.GMDEBUG.site_info = siteInfo;
    window.GMSOFT_SIGNED = input.signedDomainToken;
    window.GMSOFT_SDKTYPE = "gm";
    window.sdkType = "gm";
    window.unityhostname = hostName;

    window.GMSOFT_GAME_INFO = gameInfo;
    window.GMSOFT_ADS_INFO = adsInfo;

    try {
      localStorage.setItem("gmsdksigndomain", input.signedDomainToken);
      localStorage.setItem("gm_game_info", safeJsonStringify(responseBody));
      localStorage.setItem("gameInfoResponse", safeJsonStringify(responseBody));
      localStorage.setItem("gm_game_info_param", input.gameInfoParam || "");
      localStorage.setItem("gm_ad_info_param", input.adInfoParam || "");
      localStorage.setItem("gmsoft_options", safeJsonStringify(window.GMSOFT_OPTIONS));
      localStorage.setItem("gmsoft_game", safeJsonStringify(siteInfo.game || {}));
      localStorage.setItem("gmsdk_site_info", safeJsonStringify(siteInfo));
    } catch (error) {}

    installNetworkShim(function() {
      return safeJsonStringify(window.__ESCAPE_RAID_GMSOFT_RESPONSE || responseBody);
    }, function() {
      return safeJsonStringify(window.__ESCAPE_RAID_SITE_INFO || siteInfo);
    });

    window.httpGet = httpGet;
    window.isDiffHost = isDiffHost;
    window.is_diff_host = isDiffHost;
    window.isHostOnGDSDK = isHostOnGDSDK;

    pinUnlockState(input, siteInfo, gameInfo, adsInfo);
    dispatchReady();
  }

  window.__gmsoftBootstrap = bootstrap;
  bootstrap();
})();
