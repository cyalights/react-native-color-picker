import React, { Component, PropTypes } from 'react'
import { TouchableOpacity, Slider, View, Image, StyleSheet, InteractionManager } from 'react-native'
import tinycolor from 'tinycolor2'
import { createPanResponder } from './utils'

export class HoloColorPicker extends Component {

  constructor(props, ctx) {
    super(props, ctx)
    this.state = {
      color: { h: 0, s: 1, v: 1 },
      pickerSize: null,
      h: null,
      s: null,
    }
    if (props.oldColor) {
      this.state.color = tinycolor(props.oldColor).toHsv()
    }
    if (props.defaultColor) {
      this.state.color = tinycolor(props.defaultColor).toHsv()
    }
    this._layout = { width: 0, height: 0, x: 0, y: 0 }
    this._pageX = 0
    this._pageY = 0
    this._onLayout = this._onLayout.bind(this)
    this._onSValueChange = this._onSValueChange.bind(this)
    this._onVValueChange = this._onVValueChange.bind(this)
    this._onColorSelected = this._onColorSelected.bind(this)
    this._onOldColorSelected = this._onOldColorSelected.bind(this)
  }

  _getColor() {
    const passedColor = typeof this.props.color === 'string'
      ? tinycolor(this.props.color).toHsv()
      : this.props.color
    return passedColor || this.state.color
  }

  _onColorSelected() {
    const { onColorSelected } = this.props
    const color = tinycolor(this._getColor()).toHexString()
    onColorSelected && onColorSelected(color)
  }

  _onOldColorSelected() {
    const { oldColor, onOldColorSelected } = this.props
    const color = tinycolor(oldColor)
    this.setState({ color: color.toHsv() })
    onOldColorSelected && onOldColorSelected(color.toHexString())
  }

  _onSValueChange(s) {
    let { h, v } = this._getColor()

    if (!s) {
      this.setState({ h })
    }
    else if (this.state.h != null) {
      h = this.state.h
      this.setState({ h: null })
    }

    this._onColorChange({ h, s, v })
  }

  _onVValueChange(v) {
    let { h, s } = this._getColor()

    if (!v) {
      this.setState({ h })

      if (s)
        this.setState({ s })
    }
    else if (this.state.h != null) {
      h = this.state.h

      if (this.state.s != null)
        s = this.state.s

      this.setState({ h: null, s: null })
    }

    this._onColorChange({ h, s, v })
  }

  _onColorChange(color) {
    this.setState({ color })
    if (this.props.onColorChange) {
      this.props.onColorChange(color)
    }
  }

  _onLayout(l) {
    this._layout = l.nativeEvent.layout
    const { width, height } = this._layout
    const pickerSize = Math.min(width, height)
    if (this.state.pickerSize !== pickerSize) {
      this.setState({ pickerSize })
    }
    // layout.x, layout.y is always 0
    // we always measure because layout is the same even though picker is moved on the page
    InteractionManager.runAfterInteractions(() => {
      // measure only after (possible) animation ended
      this.refs.pickerContainer && this.refs.pickerContainer.measure((x, y, width, height, pageX, pageY) => {
        // picker position in the screen
        this._pageX = pageX
        this._pageY = pageY
      })
    })
  }

  _computeHValue(x, y) {
    const mx = this.state.pickerSize / 2
    const my = this.state.pickerSize / 2
    const dx = x - mx
    const dy = y - my
    const rad = Math.atan2(dx, dy) + Math.PI + Math.PI / 2
    return rad * 180 / Math.PI % 360
  }

  _hValueToRad(deg) {
    const rad = deg * Math.PI / 180
    return rad - Math.PI - Math.PI / 2
  }

  getColor() {
    return tinycolor(this._getColor()).toHexString()
  }

  componentWillMount() {
    const handleColorChange = ({ x, y }) => {
      const { s, v } = this._getColor()
      const marginLeft = (this._layout.width - this.state.pickerSize) / 2
      const marginTop = (this._layout.height - this.state.pickerSize) / 2
      const relativeX = x - this._pageX - marginLeft;
      const relativeY = y - this._pageY - marginTop;
      const h = this._computeHValue(relativeX, relativeY)
      this._onColorChange({ h, s, v })
    }
    this._pickerResponder = createPanResponder({
      onStart: handleColorChange,
      onMove: handleColorChange,
    })
  }

  render() {
    const { pickerSize } = this.state
    const { oldColor, style } = this.props
    const color = this._getColor()
    const { h, s, v } = color
    const angle = this._hValueToRad(h)
    const selectedColor = tinycolor(color).toHexString()
    const indicatorColor = tinycolor({ h, s: 1, v: 1 }).toHexString()
    const computed = makeComputedStyles({
      pickerSize,
      selectedColor,
      indicatorColor,
      oldColor,
      angle,
    })
    return (
      <View style={style}>
        <View onLayout={this._onLayout} ref='pickerContainer' style={styles.pickerContainer}>
          {!pickerSize ? null :
          <View>
            <View
              {...this._pickerResponder.panHandlers}
              style={[styles.picker, computed.picker]}
              collapsable={false}
            >
              <Image
                source={require('../resources/color-circle.png')}
                resizeMode='contain'
                style={[styles.pickerImage]}
              />
            </View>
            {oldColor &&
            <TouchableOpacity
              style={[styles.selectedPreview, computed.selectedPreview]}
              onPress={this._onColorSelected}
              activeOpacity={0.7}
            />
            }
            {oldColor &&
            <TouchableOpacity
              style={[styles.originalPreview, computed.originalPreview]}
              onPress={this._onOldColorSelected}
              activeOpacity={0.7}
            />
            }
            {!oldColor &&
            <TouchableOpacity
              style={[styles.selectedFullPreview, computed.selectedFullPreview]}
              onPress={this._onColorSelected}
              activeOpacity={0.7}
            />
            }
          </View>
          }
        </View>
        <View style={{ paddingTop: 20 }}>
          <Slider value={s} onSlidingComplete={this._onSValueChange} disabled={!v} />
          <Slider value={v} onSlidingComplete={this._onVValueChange} />
        </View>
      </View>
    )
  }

}

HoloColorPicker.propTypes = {
  color: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({ h: PropTypes.number, s: PropTypes.number, v: PropTypes.number }),
  ]),
  defaultColor: PropTypes.string,
  oldColor: PropTypes.string,
  onColorChange: PropTypes.func,
  onColorSelected: PropTypes.func,
  onOldColorSelected: PropTypes.func,
}

const makeComputedStyles = ({
  indicatorColor,
  selectedColor,
  oldColor,
  angle,
  pickerSize,
}) => {
  const summarySize = 0.5 * pickerSize
  const indicatorPickerRatio = 42 / 510 // computed from picker image
  const indicatorSize = indicatorPickerRatio * pickerSize
  const pickerPadding = indicatorSize / 3
  const indicatorRadius = pickerSize / 2 - indicatorSize / 2 - pickerPadding
  const mx = pickerSize / 2
  const my = pickerSize / 2
  const dx = Math.cos(angle) * indicatorRadius
  const dy = Math.sin(angle) * indicatorRadius
  return {
    picker: {
      padding: pickerPadding,
      width: pickerSize,
      height: pickerSize,
    },
    selectedPreview: {
      width: summarySize / 2,
      height: summarySize,
      top: pickerSize / 2 - summarySize / 2,
      left: Math.floor(pickerSize / 2),
      borderTopRightRadius: summarySize / 2,
      borderBottomRightRadius: summarySize / 2,
      backgroundColor: selectedColor,
    },
    originalPreview: {
      width: Math.ceil(summarySize / 2),
      height: summarySize,
      top: pickerSize / 2 - summarySize / 2,
      left: pickerSize / 2 - summarySize / 2,
      borderTopLeftRadius: summarySize / 2,
      borderBottomLeftRadius: summarySize / 2,
      backgroundColor: oldColor,
    },
    selectedFullPreview: {
      width: summarySize,
      height: summarySize,
      top: pickerSize / 2 - summarySize / 2,
      left: pickerSize / 2 - summarySize / 2,
      borderRadius: summarySize / 2,
      backgroundColor: selectedColor,
    },
  }
}

const styles = StyleSheet.create({
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerImage: {
    flex: 1,
    width: null,
    height: null,
  },
  selectedPreview: {
    position: 'absolute',
    borderLeftWidth: 0,
  },
  originalPreview: {
    position: 'absolute',
    borderRightWidth: 0,
  },
  selectedFullPreview: {
    position: 'absolute',
  },
  pickerAlignment: {
    alignItems: 'center',
  }
})
