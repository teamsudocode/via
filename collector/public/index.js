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

//Vega
(async function () {
    var socket = io();
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
                    prevAcc = data
                    view.insert('table', data).run()
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