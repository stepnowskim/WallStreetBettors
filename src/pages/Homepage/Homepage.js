import Chart from "react-apexcharts";
import "./Homepage.css"
import { getTickerData } from '../../api/api.js'
import {series} from "./tempData.js"
import Search from './tickerSearch.js'
import React from "react";


const queryString = require("query-string")
var dayjs = require("dayjs");
var sma5, sma20 = [];

function getSMA(data, period) {
  var arr = [];
  var value = 0;
  for (var i = 0; i <= data.length - period; i++) {
    if (arr[i - 1]) {
      arr.push({
        x: data[i + period - 1].x,
        y:
          (arr[i - 1].y * period -
            data[i - 1].y[3] +
            data[i + period - 1].y[3]) /
          period,
      });
    } else if(data[i].y[3] !== null) {
      for (var j = i; j < i + period; j++) {
        value += data[j].y[3];
      }
      arr.push({ x: data[i + period - 1].x, y: value / period });
      value = 0;
    }
  }
  var length = arr.length + 1
  console.log(length + " " + period)
  for (var i = 0; i < data.length + 1 - length ; i++) {
    arr.unshift({ x: "undefined", y: null });
  }
  getCross(arr,period);
  return arr;
}

function getCandleEMA(data, period) {
  var multiplier = 2 / (1 + period);
  var ema = getSMA(data, period);
  console.log(ema);
  for (var i = period - 1; i < data.length; i++) {
    if (ema[i - 1].y) {
      ema[i].y = (data[i].y[3] - ema[i - 1].y) * multiplier + ema[i - 1].y;
    }
  }
  return ema;
}

function linetocandle(data){
  var candledata = [];
  for(var i = 0; i <data.length; i++){
    candledata.push({
      x: data[i].x,
      y: [null,null,null,data[i].y]
    })
  }
  return candledata;
}

function getMACD(data, period1, period2){
  var macd = [];
  var greater = period1 > period2 ? period1 : period2
  var ema26 = getCandleEMA(data,period1)
  var ema12 = getCandleEMA(data,period2)
  for(var i = 0; i < greater; i++){
    macd.push({
      x:data[i].x,
      y:null
    })
  }
  for(var i = greater; i < data.length; i++){
    macd.push({x:ema26[i].x,y:ema12[i].y - ema26[i].y})
  }
  return macd;
}

function getHistogram(data1, data2) {
  var histData = [];
  for(var i = 0; i < data1.length;i++){
    if(data1[i].y !== null && data2[i].y !== null){
      histData.push({
        x:data1[i].x,
        y:data1[i].y - data2[i].y,
      })
    } else{
      histData.push({
        x: "undefined",
        y: null
      })
    }
  }
  return histData
}


// getCross shows when the sma5 and sma20 cross it then takes into
// account the price and will buy or sell depending on previous action
function getCross(arr, period) {
  var sma20Single, sma5Single;
  var cross, previousCross = false;
  var buy = true;
  var totalMoney = 0;
  var test =[];
  
  // setting the universal array variables to sma5, and sma20 equal to 
  // their respective calls
  if (period === 5) sma5 = arr;
  if (period === 20) sma20 = arr;

  // will iterate through the length of the sma20 array (all of the data points)
  for (var i = 0; i < sma20.length; i++) {

    // This checks if the values are undefined incase we get 
    // bad/missing data and just wont run anything in that case. 
    if ((sma20[i] !== undefined && sma5[i] !== undefined)) {

      //Setting objects equal to a single datapoint so the properties (x(date),y(price)) can be used
      sma20Single = Object.values(sma20[i]);
      sma5Single = Object.values(sma5[i]);
      // Checks if the values arent null. Due to it being '20 data pt simple moving average' 
      // before 20 data pts it is null
      if (sma20Single[1] !== null && sma5Single[1] !== null) {

        //if shorter (sma20) is greater than sma5 then its a buy signal
        //We should then buy the stock even is sma20 starts out higher (this wouldnt matter with live trading)
        //The cycle then continues aslong as it starts like this to buy whenever sma20 is higher then sma5
        if (sma5Single[1] > sma20Single[1]) {
          cross = true;
        }
        if (sma5Single[1] < sma20Single[1]) {
          cross = false;
        }

        // First time a cross is set to true (sma5 > sma20) then it will signal a cross and a buy must happen
        if (cross !== previousCross) {
          // Then the previousCross signal is set to the same as the current cross signal it it can see 
          // when a change happens the next time for it to run
          previousCross = cross;
          //console.log(`Lined Crossed at: ${sma5Single[0]}`);

          if (buy === true) {
            //totalMoney variable once something is bought it set = to the -purchase price
            totalMoney -= sma5Single[1];
            //console.log(`Buy! @ ${sma5Single[1]}`);
            test.push({x: sma5Single[0],borderColor:'#1bfa44', label: {text: 'Buy'}, borderWidth: 3})
            //datesBought = [sma5Single];
            //boughtAndSoldMap[sma5Single[0]] = sma5Single[1];
            buy = false;
          } else {
            // totamoney variable once something is sold is set = to the + sell price
            totalMoney += sma5Single[1]
            //console.log(`Sell! @ ${sma5Single[1]}`);
            //console.log(`profit: $${totalMoney} per share`)
            test.push({x: sma5Single[0],borderColor:'#de0408', label: {text: 'Sell'},borderWidth: 3})
            //boughtAndSoldMap[sma5Single[0]] = sma5Single[1]
            buy = true;
          }
        }
      }
    }
  }
  //console.log(test)
  return test;
}

class Homepage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ticker: "",
      data: null,
      sma: null,
      sma2: null,
      macd: null,
      signal: null,
      annotations:null,
    };
  }

  handleSubmit = (event) => {
    this.setState({signal: null, macd: null})
    event.preventDefault();
    var ticker = event.target[0].value;
    var interval = event.target[1].value;
    var sDate = event.target[2].value;
    var eDate = event.target[3].value;
    var limit = event.target[4].value;

    var params = {
      sDate: sDate !== "" ? sDate : undefined,
      eDate: eDate !== "" ? eDate : undefined,
      interval: interval,
      limit: limit,
    };

    var query = queryString.stringify(params);
    console.log(query)

    fetch(`/ticker/${ticker}${query !== "" ? "?" + query : ""}`)
    .then(res => res.json())
    .then(data => {
      this.setState({
          data: data,
          sma: getSMA(data, 5),
          sma2: getSMA(data, 20),
          macd: getMACD(data,26,12),
          signal: getSMA(linetocandle(getMACD(data,26,12)),9),
          annotations: getCross()
        })
    })
  }
  
  render () {
    console.log(this.state.sma)
    console.log(this.state.sma2)
    var options = {
      chart: {
        group: "combine",
        id: "candlestick",
      },
      annotations: {
        xaxis: this.state.annotations,
      },
      yaxis: {
        decimalsInFloat: 2,
        labels: {
          style: {
            colors: ["#000000"],
          },
          minWidth: 40,
          maxWidth: 40
        },
      },
      tooltip: {
        enabled: true,
        shared: true,
      },
      markers: {
        size: .5,
      },
      stroke: {
        width: [1, 5, 5],
      },
    };
    return (
      <div className="App-header">
        <Search onSubmit={this.handleSubmit} />
        <br />
        {this.state.data !== null &&
          this.state.sma !== null && 
          this.state.macd !== null &&
          this.state.signal !== null && (
            <div>
              <Chart
                options={options}
                series={[
                  {
                    name: "close",
                    type: "candlestick",
                    data: this.state.data,
                  },
                  {
                    name: "sma5",
                    type: "line",
                    data: this.state.sma,
                  },
                  {
                    name: "sma20",
                    type: "line",
                    data: this.state.sma2,
                  },
                ]}
                className="candlestickchart"
                width="1200px"
                height="750px"
              />
              <br />
              <Chart
                options={{
                  chart: {
                    group: "combine",
                    id: "macd",
                    type: "line",
                  },
                  yaxis: {
                    decimalsInFloat: 2,
                    labels: { 
                      minWidth: 40,
                      maxWidth: 40
                    },
                  },
                  markers: {
                    size: .5,
                  },
                  stroke: {
                    width: [2,2],
                  },
                  plotOptions: {
                    bar: {
                      colors: {
                        ranges: [{
                          from: -1000,
                          to: 0,
                          color: '#de0408'
                        }, {
                          from: 0,
                          to: 1000,
                          color: '#1bfa44'
                        }]
                      }
                    }
                  },
                  stroke: {
                    width: [2,2,0],
                  }
                }}
                series={[
                  {
                    name: "macd",
                    type: "line",
                    data: this.state.macd,
                  },
                  {
                    name: "signal",
                    type: "line",
                    data: this.state.signal,
                  },
                  {
                    name:"test",
                    type: "bar",
                    data: getHistogram(this.state.macd, this.state.signal)
                  },
                ]}
                className = "macdchart"
                height = "300px"
              />
            </div>
          )}
      </div>
    );
  }
}

export default Homepage;
