(function() {
  const gamesdkUrlPattern = /api\.cdnwave\.com\/sdkdom\/gamesdk/i;

  function installFirebaseStubs() {
    function noop() {}
    window.firebaseLogEvent = window.firebaseLogEvent || noop;
    window.firebaseLogEventParameter = window.firebaseLogEventParameter || noop;
    window.firebaseSetUserProperties = window.firebaseSetUserProperties || noop;
  }

  function installAdStubs() {
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
    window._showRewardAdFn = window._showRewardAdFn || function(callback) {
      if (typeof callback === "function") {
        callback();
      }
    };
  }

  function installSdkStubs(gameInfoParam, adInfoParam) {
    function noop() {}
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

  function installNetworkShim(makeBody) {
    if (!window.__gmsoftEscapeRaidNetworkInstalled) {
      window.__gmsoftEscapeRaidNetworkInstalled = true;

      const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
      if (nativeFetch) {
        window.fetch = function(resource, init) {
          const url = typeof resource === "string" ? resource : resource && resource.url;
          if (typeof url === "string" && gamesdkUrlPattern.test(url)) {
            return Promise.resolve(new Response(makeBody(), {
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
        this.__gmsoftSdkIntercept = typeof url === "string" && gamesdkUrlPattern.test(url);
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

        const payload = makeBody();
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
  }

  window.__gmsoftEscapeRaid = {
    init: function(options) {
      const body = JSON.stringify(options.responseBody);
      const signedToken = options.signedDomainToken;
      const gameInfoParam = options.gameInfoParam;
      const adInfoParam = options.adInfoParam;

      installFirebaseStubs();
      installAdStubs();
      installSdkStubs(gameInfoParam, adInfoParam);
      installNetworkShim(function() {
        return JSON.stringify(window.__gmsoftEscapeRaidResponseBody || options.responseBody);
      });

      window.__gmsoftEscapeRaidResponseBody = options.responseBody;
      window.GMSOFT_SDKTYPE = "gm";
      window.sdkType = "gm";
      window.GMSOFT_SIGNED = signedToken;
      window.gameinfo = options.responseBody.gameinfo;
      window.adsinfo = options.responseBody.adsinfo;
      window.regisinfo = options.responseBody.regisinfo;
      window.GMSOFT_GAME_INFO = {
        sdktype: "gm",
        more_games_url: options.responseBody.gameinfo.moregames_url || "",
        promotion: options.responseBody.gameinfo.promotion || {}
      };
      window.GMSOFT_ADS_INFO = {
        enable: options.responseBody.adsinfo.enable || "no",
        sdk_type: "gm",
        time_show_inter: Number(options.responseBody.adsinfo.time_show_inter || 0),
        time_show_reward: Number(options.responseBody.adsinfo.time_show_reward || 0),
        reward: options.responseBody.adsinfo.enable_reward || "no",
        enable_reward: options.responseBody.adsinfo.enable_reward || "no",
        enable_interstitial: options.responseBody.adsinfo.enable_interstitial || "no",
        enable_preroll: options.responseBody.adsinfo.enable_preroll || "no"
      };

      try {
        localStorage.setItem("gmsdksigndomain", signedToken);
        localStorage.setItem("gm_game_info", body);
        localStorage.setItem("gameInfoResponse", body);
        localStorage.setItem("gm_game_info_param", gameInfoParam);
        localStorage.setItem("gm_ad_info_param", adInfoParam);
      } catch (error) {}

      document.dispatchEvent(new CustomEvent("gmsoftSdkReady"));
      window.dispatchEvent(new Event("gmsoftSdkReady"));
    }
  };
})();
