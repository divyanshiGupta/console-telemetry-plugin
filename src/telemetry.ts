const segmentKey: string =
  (window as any).SEGMENT_KEY || '%SEGMENT_KEY_PLACEHOLDER%';

if (!segmentKey) {
  console.warn('console-telemetry-plugin: no SEGMENT_KEY configured');
}

const initSegment = () => {
  const analytics = ((window as any).analytics =
    (window as any).analytics || []);
  if (analytics.initialize) {
    return;
  }
  if (analytics.invoked) {
    console.error('console-telemetry-plugin: segment snippet included twice');
  } else {
    analytics.invoked = true;
    analytics.methods = [
      'trackSubmit',
      'trackClick',
      'trackLink',
      'trackForm',
      'pageview',
      'identify',
      'reset',
      'group',
      'track',
      'ready',
      'alias',
      'debug',
      'page',
      'once',
      'off',
      'on',
      'addSourceMiddleware',
      'addIntegrationMiddleware',
      'setAnonymousId',
      'addDestinationMiddleware',
    ];
    analytics.factory = function (e: string) {
      return function () {
        const t = Array.prototype.slice.call(arguments);
        t.unshift(e);
        analytics.push(t);
        return analytics;
      };
    };
    for (let e = 0; e < analytics.methods.length; e++) {
      const key = analytics.methods[e];
      analytics[key] = analytics.factory(key);
    }
    analytics.load = function (key: string, e: Event) {
      const t = document.createElement('script');
      t.type = 'text/javascript';
      t.async = true;
      t.src = `https://cdn.segment.com/analytics.js/v1/${encodeURIComponent(
        key,
      )}/analytics.min.js`;
      const n = document.getElementsByTagName('script')[0];
      if (n.parentNode) {
        n.parentNode.insertBefore(t, n);
      }
      analytics._loadOptions = e;
    };
    analytics.SNIPPET_VERSION = '4.13.1';
    if (segmentKey) {
      analytics.load(segmentKey);
    }
  }
};

initSegment();

const anonymousIP = {
  context: {
    ip: '0.0.0.0',
  },
};

export const eventListener = async (eventType: string, properties?: any) => {
  if (!segmentKey) {
    console.log(
      'console-telemetry-plugin: received telemetry event:',
      eventType,
      properties,
    );
  } else {
    switch (eventType) {
      case 'identify':
        {
          const { user, ...otherProperties } = properties;
          const id = user?.metadata?.name;
          if (id) {
            // Use SHA1 hash algorithm to anonymize the user
            const anonymousIdBuffer = await crypto.subtle.digest(
              'SHA-1',
              new TextEncoder().encode(id),
            );
            const anonymousIdArray = Array.from(
              new Uint8Array(anonymousIdBuffer),
            );
            const anonymousId = anonymousIdArray
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
            (window as any).analytics.identify(
              anonymousId,
              otherProperties,
              anonymousIP,
            );
          } else {
            console.error(
              'console-telemetry-plugin: unable to identify as no user name was provided',
            );
          }
        }
        break;
      case 'page':
        (window as any).analytics.page(undefined, properties, anonymousIP);
        break;
      default:
        (window as any).analytics.track(eventType, properties, anonymousIP);
    }
  }
};
