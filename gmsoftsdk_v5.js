(function() {
  const sdkUrlMatchers = [
    /api\.cdnwave\.com\/sdkdom\/gamesdk/i,
    /api\.azgame\.io\/sdk\/gmadsv1/i,
    /games\.yoplay\.io\/sdk\/gmadsv1/i
  ];

  function noop() {}

  function matchesSdkUrl(url) {
    return typeof url === "string" && sdkUrlMatchers.some(function(pattern) {
      return pattern.test(url);
    });
  }

  function safeJson(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return "{}";
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
    window._showRewardAdFn = window._showRewardAdFn || null;
    window.afg = window.afg || {
      ready: true,
      onBeforeAd: noop,
      onAfterAd: noop
    };
  }

  function installSdkGlobals(gameInfoParam, adInfoParam) {
    function runCallback(callback) {
      if (typeof callback === "function") {
        callback();
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
    window.GMSDK.SetGameInfoParam = window.GMSDK.SetGameInfoParam || function() {
      return gameInfoParam;
    };
    window.GMAdvertisementManager = window.GMAdvertisementManager || {};
    window.GMAdvertisementManager.SetAdParam = window.GMAdvertisementManager.SetAdParam || function() {
      return adInfoParam;
    };
    window.GMAnalytics = window.GMAnalytics || {
      LogEvent: noop
    };
  }

  function installNetworkShim(getBody) {
    if (window.__gmsoftEscapeRaidNetworkInstalled) {
      return;
    }
    window.__gmsoftEscapeRaidNetworkInstalled = true;

    const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
    if (nativeFetch) {
      window.fetch = function(resource, init) {
        const url = typeof resource === "string" ? resource : resource && resource.url;
        if (matchesSdkUrl(url)) {
          return Promise.resolve(new Response(getBody(), {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }));
        }
        return nativeFetch(resource, init);
      };
    }

    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSend = XMLHttpRequest.prototype.send;
    const nativeSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const nativeGetResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
    const nativeGetAllResponseHeaders = XMLHttpRequest.prototype.getAllResponseHeaders;

    XMLHttpRequest.prototype.open = function(method, url) {
      this.__gmsoftSdkIntercept = matchesSdkUrl(typeof url === "string" ? url : "");
      if (!this.__gmsoftSdkIntercept) {
        return nativeOpen.apply(this, arguments);
      }
      this.readyState = 1;
      if (typeof this.onreadystatechange === "function") {
        this.onreadystatechange();
      }
    };

    XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
      if (!this.__gmsoftSdkIntercept) {
        return nativeSetRequestHeader.call(this, name, value);
      }
    };

    XMLHttpRequest.prototype.send = function() {
      if (!this.__gmsoftSdkIntercept) {
        return nativeSend.apply(this, arguments);
      }

      const payload = getBody();
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
      if (this.__gmsoftSdkIntercept) {
        return name && name.toLowerCase() === "content-type" ? "application/json" : null;
      }
      return nativeGetResponseHeader.call(this, name);
    };

    XMLHttpRequest.prototype.getAllResponseHeaders = function() {
      if (this.__gmsoftSdkIntercept) {
        return "content-type: application/json\r\n";
      }
      return nativeGetAllResponseHeaders.call(this);
    };
  }

  function httpGet(url) {
    if (matchesSdkUrl(url)) {
      return safeJson(window.__gmsoftEscapeRaidResponseBody || {});
    }
    const request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send("");
    return request.responseText;
  }

  function isDiffHost() {
    return false;
  }

  function dispatchReady() {
    document.dispatchEvent(new CustomEvent("gmsoftSdkReady"));
    window.dispatchEvent(new Event("gmsoftSdkReady"));
  }

  function keepUnlocked(gameMeta, promotion) {
    if (window.__gmsoftEscapeRaidUnlockInterval) {
      clearInterval(window.__gmsoftEscapeRaidUnlockInterval);
    }
    window.__gmsoftEscapeRaidUnlockInterval = setInterval(function() {
      if (!window.GMSOFT_OPTIONS) {
        window.GMSOFT_OPTIONS = {};
      }
      window.GMSOFT_OPTIONS.allow_play = "yes";
      window.GMSOFT_OPTIONS.allow_host = "yes";
      window.GMSOFT_OPTIONS.allow_embed = "yes";
      window.GMSOFT_OPTIONS.sdkType = "gm";
      window.GMSOFT_OPTIONS.game = gameMeta;
      window.GMSOFT_OPTIONS.promotion = promotion;
      window.GMSOFT_SDKTYPE = "gm";
      window.sdkType = "gm";
      if (!window.GmSoft) {
        window.GmSoft = {};
      }
      window.GmSoft.allow_play = "yes";
    }, 250);
  }

  function applyResponse(responseBody, signedToken, gameInfoParam, adInfoParam) {
    const regisinfo = responseBody.regisinfo || {};
    const gameinfo = responseBody.gameinfo || {};
    const promotion = gameinfo.promotion || {};
    const adsinfo = responseBody.adsinfo || {};
    const signed = regisinfo.signed || signedToken;
    const body = safeJson(responseBody);
    const existingOptions = window.GMSOFT_OPTIONS || {};
    const gameMeta = responseBody.game || gameinfo.game || {
      name: regisinfo.name || existingOptions.productName || "Escape Raid",
      description: regisinfo.description || "",
      image: regisinfo.image || "loading.png",
      redirect_url: regisinfo.redirect_url || ""
    };

    window.__gmsoftEscapeRaidResponseBody = responseBody;
    window.GMSOFT_SDKTYPE = "gm";
    window.sdkType = "gm";
    window.GMSOFT_SIGNED = signed;
    window.regisinfo = regisinfo;
    window.gameinfo = gameinfo;
    window.adsinfo = adsinfo;
    window.GMSOFT_GAME_INFO = {
      sdktype: window.GMSOFT_SDKTYPE,
      more_games_url: gameinfo.moregames_url || "",
      promotion: promotion
    };
    window.GMSOFT_ADS_INFO = {
      enable: adsinfo.enable || "no",
      sdk_type: adsinfo.sdk_type || "gm",
      time_show_inter: Number(adsinfo.time_show_inter || 60),
      time_show_reward: Number(adsinfo.time_show_reward || 60),
      pubid: adsinfo.pubid || "",
      reward: adsinfo.reward || "no",
      gd_game_key: "",
      wgLibrary: adsinfo.wgLibrary || "",
      wgConf: adsinfo.wgConf || "",
      enable_reward: adsinfo.enable_reward || "no",
      enable_interstitial: adsinfo.enable_interstitial || "no",
      enable_preroll: adsinfo.enable_preroll || "no"
    };

    window.GMSOFT_OPTIONS = Object.assign({}, existingOptions, {
      enableAds: false,
      debug: false,
      pub_id: adsinfo.pubid || existingOptions.pub_id || "",
      unlockTimer: Number(regisinfo.unlock_timer || existingOptions.unlockTimer || 0),
      timeShowInter: Number(adsinfo.time_show_inter || existingOptions.timeShowInter || 60),
      timeShowReward: Number(adsinfo.time_show_reward || existingOptions.timeShowReward || 60),
      domainHost: window.location.hostname,
      sdkversion: existingOptions.sdkversion || 5,
      adsDebug: false,
      game: gameMeta,
      promotion: promotion,
      allow_play: "yes",
      allow_host: "yes",
      allow_embed: "yes",
      enablePreroll: "no",
      sdkType: "gm",
      hostindex: 0,
      gdHost: false
    });

    window.GMSOFT_OPTIONS.allow_play = "yes";
    window.GMSOFT_OPTIONS.allow_host = "yes";
    window.GMSOFT_OPTIONS.allow_embed = "yes";
    window.GMSOFT_OPTIONS.game = gameMeta;
    window.GMSOFT_OPTIONS.promotion = promotion;
    window.GMSOFT_OPTIONS.sdkType = "gm";

    try {
      localStorage.setItem("gmsdksigndomain", signed);
      localStorage.setItem("gm_game_info", body);
      localStorage.setItem("gameInfoResponse", body);
      localStorage.setItem("gm_game_info_param", gameInfoParam);
      localStorage.setItem("gm_ad_info_param", adInfoParam);
      localStorage.setItem("gmsoft_options", safeJson(window.GMSOFT_OPTIONS));
      localStorage.setItem("gmsoft_game", safeJson(gameMeta));
    } catch (error) {}

    keepUnlocked(gameMeta, promotion);
  }

  function buildVerifyUrl(urlRequest, gameId) {
    const hostName = location.hostname || "localhost";
    const timeSlice = Math.floor(Date.now() / 30000);
    const params = "d=" + hostName +
      "&gid=" + (gameId || "") +
      "&hn=" + hostName +
      "&pn=" + location.pathname +
      "&ts=" + timeSlice +
      "&ie=no";
    return urlRequest + "?params=" + btoa(params);
  }

  window.httpGet = window.httpGet || httpGet;
  window.is_diff_host = window.is_diff_host || isDiffHost;
  window.isDiffHost = window.isDiffHost || isDiffHost;

  window.__gmsoftEscapeRaid = {
    init: function(options) {
      const signedToken = options.signedDomainToken;
      const gameInfoParam = options.gameInfoParam;
      const adInfoParam = options.adInfoParam;
      const urlRequest = options.urlRequest || "https://api.azgame.io/sdk/gmadsv1";

      installFirebaseStubs();
      installAdsStubs();
      installSdkGlobals(gameInfoParam, adInfoParam);
      installNetworkShim(function() {
        return safeJson(window.__gmsoftEscapeRaidResponseBody || options.responseBody);
      });

      window.GMSOFT_OPTIONS = options.config || {};
      window.GMSOFT_SDKTYPE = "gm";
      window.sdkType = "gm";

      try {
        const verifyUrl = buildVerifyUrl(urlRequest, window.GMSOFT_OPTIONS.gameId || "");
        const bodyText = httpGet(verifyUrl);
        const responseBody = JSON.parse(bodyText || "{}");
        applyResponse(responseBody, signedToken, gameInfoParam, adInfoParam);
      } catch (error) {
        applyResponse(options.responseBody || {}, signedToken, gameInfoParam, adInfoParam);
      }

      window.GmSoft = window.GmSoft || {};
      window.GmSoft.Init = window.GmSoft.Init || function() {
        return true;
      };
      window.GmSoft.Ready = window.GmSoft.Ready || function() {
        return true;
      };
      window.GmSoft.SetParam = window.GmSoft.SetParam || function() {
        window.GMSOFT_OPTIONS.allow_play = "yes";
        return true;
      };
      window.GmSoft.GetParam = window.GmSoft.GetParam || function(key) {
        if (key === "allow_play") {
          return "yes";
        }
        return "";
      };
      window.SetParam = window.SetParam || window.GmSoft.SetParam;

      dispatchReady();
    }
  };
})();
