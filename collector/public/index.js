var app = new Vue({
  el: '#app',
  data() {
    return {
      active: false,
      eventType: "Encountered a Pothole", //driving for null
      condition: "Good",
      speed: 50,
      number: 0,
      tweenedNumber: 0
    };
  },
  computed: {
    conditionClass: function () {
      return {
        red: this.condition === "Poor",
        green: this.condition === "Good"
      };
    },
    animatedNumber: function () {
      return this.tweenedNumber.toFixed(0);
    },
    eventClass: function () {
      return {
        red: this.eventType !== "Driving"
      };
    }
  },
  watch: {
    speed: function (newValue) {
      TweenLite.to(this.$data, 0.5, {
        tweenedNumber: newValue
      });
    }
  },

  mounted() {
    let tweenMax = document.createElement("script");
    tweenMax.setAttribute(
      "src",
      "https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.1/TweenLite.min.js"
    );
    document.head.appendChild(tweenMax);
  }
})
var browserwidth =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;

const GRAVITY = 9.8,
      HIGHPASS_CUTOFF = 2,
      JERK_FREQ_FOR_RUGGED = 5,
      JERK_DURATION_FOR_RUGGED_SECONDS = 5;


//Vega
(async function () {
  var socket = io();
  // let specs = await fetchJSON('/spec.json').then((r) => r.json);
  // let spec_size = specs.smooth.length

  const spec = {
    $schema: "https://vega.github.io/schema/vega-lite/v2.json",
    description: "A simple bar chart with embedded data.",
    width: browserwidth - 128,
    height: 300,
    data: {
      name: "table"
    },
    mark: {
      type: "area",
      line: {
        color: "#4899ff",
        strokeWidth: 2
      },
      color: "#111821"
    },
    encoding: {
      y: {
        field: "z",
        type: "quantitative",
        scale: {
          zero: false,
          domain: [5, 15]
        }
      },
      x: {
        field: "t",
        type: "temporal"
      },
      opacity: {
        value: 1
      }
    },
    config: {
      axis: {
        grid: false,
        ticks: false,
        domainColor: "#000000"
      },
      style: {
        view: {
          stroke: 'transparent'
        }
      }
    }
  };

  const dataInView = [];
  // var categorizationWindow = []
  vegaEmbed("#vis", spec, {
    renderer: "svg",
    actions: false
  })
    .then(function (result) {
      const view = result.view;
      // const dataInView = []
      // connect to simple echo server
      const conn = new WebSocket("wss://echo.websocket.org");
      var prevAcc = undefined

      var chart_y_to_show = [],
          prev_hiccup_at = (new Date()).getTime(),
          hiccups_past_5_seconds = 0

      conn.onopen = function (event) {
        const view = result.view;
        // const dataInView = []
        // connect to simple echo server
        // const conn = new WebSocket("wss://echo.websocket.org");

        socket.on('data', function(data) {

          if (prevAcc !== undefined) {
            let vel = (data.y - prevAcc.y) / ((data.t - prevAcc.t) / 1000)
            app.speed = Math.abs(vel)
          }
          dataInView.push(data.t)
          // categorizationWindow.push(data.z)
          prevAcc = data
          view.insert('table', data).run()

          if (chart_y_to_show.length < 5) {
            // this is when calculating strides and analysis is NOT possible
            chart_y_to_show.push(data.z)
          } else {
            // we have at least 5 values to perform analysis
            let pulses = signum(
              gradient(
                highpass_filter(chart_y_to_show, HIGHPASS_CUTOFF, GRAVITY)
              )
            )

            let jerk_status = is_hiccup(pulses)
            if (jerk_status !== false) {
              // there is a jerk
              chart_y_to_show = chart_y_to_show.slice(jerk_status,)

              let t_since_prev_hiccup = (data.t - prev_hiccup_at) / 1000

              if (t_since_prev_hiccup > JERK_DURATION_FOR_RUGGED_SECONDS) {
                hiccups_past_5_seconds = 0
              } else {
                hiccups_past_5_seconds++
              }

              // register if this is a jerk or we are on a rugged road
              if (hiccups_past_5_seconds > JERK_DURATION_FOR_RUGGED_SECONDS) {
                console.log('rugged roat at', data.t)
                app.eventType = 'Rugged road'
                app.condition = 'Poor'

              } else {
                console.log('jerk at', data.t, 'after', t_since_prev_hiccup, 'seconds')
                app.eventType = 'Hiccup'
                app.condition = 'Poor'

              }
              prev_hiccup_at = data.t

              // hiccups_past_5_seconds += t_since_prev_hiccup < JERK_DURATION_FOR_RUGGED_SECONDS ? 1 : 0

              // if (hiccups_past_5_seconds > JERK_DURATION_FOR_RUGGED_SECONDS) {
              //   console.log('rugged road at', data.t)
              //   hiccups_past_5_seconds--
              // } else {
              // }

            } else {
              // no jerk found; smooth road

              app.eventType = 'Driving'
              app.condition = 'Good'
              chart_y_to_show.shift()
            }
          }

          // if (categorizationWindow.length == spec_size) {
          //   let match = categorizeRoute(categorizationWindow.slice(-spec_size, ), specs)
          //   if (match.type)
          //     console.log(match)
          //   categorizationWindow = categorizationWindow.slice(10)
          // }

          if (dataInView.length > 100) {
            const t = dataInView.shift()
            /* console.log(t) */
            view.remove("table", function (item) {
              return item.t === t
            }).run();
            /* console.log(dataInView); */
          }

        })

        socket.on('status_change', function(res) {
          app.active = res.state
        })
      };
    })
    .catch(console.warn);
})();


function signum(arr) {
  return arr.map(x => (x > 0 ? 1 : (x == 0 ? 0 : -1)))
}

function is_hiccup(stream) {
  let strides_to_check = [2,3,4]
  for (let stride of strides_to_check) {
    for (let i = 0; i < stream.length-stride; i++) {
      let cur_window = stream.slice(i, i+stride)
      let is_all_zero = cur_window.filter(x => x !== 0).length !== 0
      let is_sum_zero = cur_window.reduce((val, acc) => val + acc) === 0
      if (!is_all_zero) {
        break;  // check for next stride
      }

      if (is_sum_zero) {
        console.log(cur_window)
        return i+stride+1;
      }

    }
  }
  return false
}

function gradient(_arr) {
  let arr1 = [..._arr, _arr[_arr.length-1]]
  let arr2 = [0, ..._arr]
  let grad = arr2.map((b, i) => arr1[i]-b)
  return grad
}

function highpass_filter(_arr, cutoff, base=0) {
  return _arr.map(x => Math.abs(x-base) > cutoff ? x : 0);
}

/*
  function categorizeRoute(_stream, specs) {
  // let max_corr = -Infinity, max_type = null
  // let threshold_confidence = 0.5
  let stream = hp_filter(_stream)
  // console.log(stream)
  // for (let key of Object.keys(specs)) {
  //   let corr = getPearsonCorrelation(stream, specs[key])
  //   if (corr > max_corr && corr > threshold_confidence) {
  //     max_type = key
  //     max_corr = corr
  //   }
  // }
  // return {
  //   confidence: max_corr,
  //   type: max_type,
  // }

  let min_err = Infinity, min_type = null
  for (let key of Object.keys(specs)) {
  let err = meanAbsError(stream, specs[key])
  if (err < min_err) {
  min_err = err
  min_type = key
  }
  }
  return {
  err: min_err,
  type: min_type
  }
  }

  function meanError(x, y) {
  let err = x.map((val, pos) => val - y[pos])
  let meanErr = err.reduce((t, s) => t+s) / err.length
  return meanErr
  }

  function meanAbsError(x, y) {
  let err = x.map((val, pos) => Math.abs(val - y[pos]))
  let meanErr = err.reduce((t, s) => t+s) / err.length
  return meanErr
  }

  function fetchJSON(url, options) {
  return fetch(url, options).then(function (response) {
  return response.json().then(function (data) {
  return {
  status: response.status,
  headers: response.headers,
  json: data
  }
  })
  })
  }

  function hp_filter(_x, value=9.8, cutoff=4) {
  let x = _x.filter(each => true)
  let retval = x.filter(each =>
  (Math.abs(each - value) > cutoff) ? each : value
  )
  return retval
  }

  function getPearsonCorrelation(x, y) {
  var shortestArrayLength = 0;

  if (x.length == y.length) {
  shortestArrayLength = x.length;
  } else if (x.length > y.length) {
  shortestArrayLength = y.length;
  console.error(
  "x has more items in it, the last " +
  (x.length - shortestArrayLength) +
  " item(s) will be ignored"
  );
  } else {
  shortestArrayLength = x.length;
  console.error(
  "y has more items in it, the last " +
  (y.length - shortestArrayLength) +
  " item(s) will be ignored"
  );
  }

  var xy = [];
  var x2 = [];
  var y2 = [];

  for (let i = 0; i < shortestArrayLength; i++) {
  xy.push(x[i] * y[i]);
  x2.push(x[i] * x[i]);
  y2.push(y[i] * y[i]);
  }

  var sum_x = 0;
  var sum_y = 0;
  var sum_xy = 0;
  var sum_x2 = 0;
  var sum_y2 = 0;

  for (let i = 0; i < shortestArrayLength; i++) {
  sum_x += x[i];
  sum_y += y[i];
  sum_xy += xy[i];
  sum_x2 += x2[i];
  sum_y2 += y2[i];
  }

  var step1 = shortestArrayLength * sum_xy - sum_x * sum_y;
  var step2 = shortestArrayLength * sum_x2 - sum_x * sum_x;
  var step3 = shortestArrayLength * sum_y2 - sum_y * sum_y;
  var step4 = Math.sqrt(step2 * step3);
  var answer = step1 / step4;

  return answer;
  }
*/
