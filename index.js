import { spritejs } from 'sprite-vue'

const { Scene, Sprite, Path, Label } = spritejs

class PolarBars {
  constructor({
    datas,
    focusColors,
    maxR,
    defaultColor,
    circle,
    width,
    height,
    tooltip
  }) {
    this.datas = datas
    this.focusColors = focusColors
    this.maxR = maxR
    this.defaultColor = defaultColor
    this.circle = circle
    this.width = width
    this.height = height
    this.tooltip = tooltip

    this.shadows = []
    this.textLabel = ''
  }

  draw(id) {
    // 初始化
    this.id = id

    const scene = new Scene('#' + id, {
      viewport: [this.width, this.height],
      resolution: 'flex'
    })

    const layer = scene.layer()

    const origin = {
      x: 320,
      y: 250
    }
    const r = 40

    const circle = new Sprite({
      size: [r * 2, r * 2],
      anchor: 0.5,
      pos: [origin.x, origin.y],
      border: [1, this.defaultColor],
      borderRadius: 100
    })

    layer.append(circle)

    this.layer = layer

    // 调整数组
    let sortDatas = [...this.datas].sort((a, b) => {
      return a.value - b.value
    })

    let min = [...sortDatas].shift()
    let max = [...sortDatas].pop()

    let topn = 10 // 要多少个顶部数据，抽成配置项
    let tops = [...sortDatas].slice(-1 * topn).reverse()

    let minR = 10 // 抽成配置项

    let aInterval = (this.maxR - minR) / (max.value - min.value) // 没处理分母为零的情况
    const PAI = 360 // 一个圆周
    let angelInterval = PAI / this.datas.length

    let searchInTops = item => {
      for (let i = 0; i < tops.length; ++i) {
        if (item.value === tops[i].value && item.title === tops[i].title) {
          return i
        }
      }

      return -1
    }

    let configDatas = [...this.datas].map((el, i) => {
      let idx = searchInTops(el)

      let partial =
        idx === -1
          ? {
              top: false,
              color: this.defaultColor
            }
          : {
              top: true,
              color: this.focusColors[idx]
            }

      return {
        ...el,
        ...partial,
        len: Number(
          Number(aInterval * (el.value - min.value) + minR).toFixed(2)
        ),
        startAngle: Number(Number(angelInterval * i).toFixed(2))
      }
    })

    // 利用整理好的数组开始划线
    const drawLine = (p1, p2, color, lineWidth) => {
      let shadow = new Path()
      let shadowD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`

      shadow.attr({
        path: shadowD,
        strokeColor: color,
        lineWidth: lineWidth
      })

      shadow['p1'] = p1
      shadow['p2'] = p2
      layer.append(shadow)

      let anim = shadow.animate(
        [
          {
            path: `M ${p1.x} ${p1.y} L ${p1.x} ${p1.y}`
          },
          {
            path: shadowD
          }
        ],
        {
          duration: 1200,
          iterations: 1,
          easing: 'ease-in-out',
          fill: 'both'
        }
      )

      return {
        anim,
        shadow
      }
    }

    const configPoint = ({ baseAngle, startAngle, len }, { origin, r }) => {
      let p1 = {
        x: origin.x + r * Math.cos(((baseAngle - startAngle) * Math.PI) / 180),
        y: origin.y - r * Math.sin(((baseAngle - startAngle) * Math.PI) / 180)
      }

      let p2 = {
        x:
          origin.x +
          (len + r) * Math.cos(((baseAngle - startAngle) * Math.PI) / 180),
        y:
          origin.y -
          (len + r) * Math.sin(((baseAngle - startAngle) * Math.PI) / 180)
      }

      return {
        p1,
        p2
      }
    }

    const makeTextLabelByALine = (p1, p2, angle, text, color) => {
      let label = new Label()

      let { pxd, pyd } = (angle => {
        angle = Number(angle)

        if (angle >= 0 && angle < 90) {
          return {
            pxd: 1,
            pyd: -1
          }
        } else if (angle >= 90 && angle < 180) {
          return {
            pxd: 1,
            pyd: 1
          }
        } else if (angle >= 180 && angle < 270) {
          return {
            pxd: -1,
            pyd: 1
          }
        } else if (angle >= 270 && angle < 360) {
          return {
            pxd: -1,
            pyd: -1
          }
        }
      })(angle)

      let width = this.tooltip.width,
        height = this.tooltip.height //  做成配置项

      let [adjustX, adjustY] = [width / 2 + 15, height / 2 + 15]

      label.attr({
        text: text,
        anchor: 0.5,
        fillColor: color,
        pos: [p2.x + pxd * adjustX, p2.y + pyd * adjustY],
        padding: [10, 0],
        font: '18px "Microsoft YaHei"',
        width,
        height,
        textAlign: 'center',
        lineBreak: 'normal',
        border: [1, color]
      })

      return label
    }

    const makeTopBallByALine = (p2, color) => {
      const ball = new Sprite()
      ball.attr({
        anchor: 0.5,
        pos: [p2.x, p2.y],
        size: [8, 8],
        bgcolor: color,
        borderRadius: 25
      })

      return ball
    }

    const slideFocus = () => {
      let shadows = this.shadows

      let _animAShadow = (shadows, i) => {
        if (i >= shadows.length) {
          return
        }

        let node = shadows[i]['shadow']

        let p1 = node['p1']
        let p2 = node['p2']

        if (this.textLabel) {
          this.layer.removeChild(this.textLabel)
        }
        if (this.topBall) {
          this.layer.removeChild(this.topBall)
        }
        let textLabel = makeTextLabelByALine(
          p1,
          p2,
          shadows[i]['startAngle'],
          shadows[i]['title'] + '\n' + shadows[i]['value'],
          shadows[i]['color']
        )

        this.layer.appendChild(textLabel)
        this.textLabel = textLabel

        let topBall = makeTopBallByALine(p2, shadows[i]['color'])
        this.layer.appendChild(topBall)
        this.topBall = topBall

        return node
          .animate(
            [
              {
                opacity: 0
              },
              {
                opacity: 1
              }
            ],
            {
              duration: 200,
              iterations: 10,
              easing: 'ease-out',
              fill: 'both'
            }
          )
          .finished.then(_ => {
            return _animAShadow(shadows, i + 1)
          })
      }

      _animAShadow(shadows, 0).then(_ => {
        slideFocus()
      })
    }

    let anims = [],
      shadows = []

    for (let i = 0; i < configDatas.length; ++i) {
      let node = configDatas[i]
      let { p1, p2 } = configPoint(
        {
          ...node,
          ...{
            baseAngle: 90
          }
        },
        {
          origin,
          r
        }
      )
      let { anim, shadow } = drawLine(p1, p2, node.color, 3)
      anims.push(anim.finished)
      shadows.push(shadow)
    }

    Promise.all(anims).then(_ => {
      shadows.forEach((el, i) => {
        let node = configDatas[i]
        if (node.top) {
          this.shadows.push({
            shadow: el,
            ...node
          })
        }
      })

      slideFocus()
    })
  }
}

export default PolarBars

/***********************/

// const getDatas = (nums) => {
//     let rets = [];
//     let hashs = "甲乙丙丁戊己庚辛壬癸";

//     for (var i = 0; i < nums; ++i) {
//         rets.push({
//             value: Math.floor(Math.random() * 200),
//             title: hashs[Math.floor(Math.random() * 10)] + hashs[Math.floor(Math.random() * 10)]
//         })
//     }

//     return rets
// }

// const getColors = (nums) => {
//     let hashs = "0123456789ABCDEF";

//     let getAColor = () => {
//         let rets = ["#"]
//         for (let i = 0; i < 6; ++i) {
//             rets.push(hashs[Math.floor(Math.random() * 16)])
//         }

//         return rets.join("");
//     };

//     let rets = [];
//     for (let i = 0; i < nums; ++i) {
//         rets.push(getAColor())
//     }
//     return rets;
// }

// let foo = new PolarBars({
//     datas: getDatas(50),
//     focusColors: getColors(10),
//     defaultColor: "#ccc",
//     maxR: 100,
//     width: 500,
//     height: 500
// })

// foo.draw("stage");
