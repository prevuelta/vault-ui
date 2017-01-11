import React from 'react';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import TextField from 'material-ui/TextField';
import FlatButton from 'material-ui/FlatButton';
import { green500, green400, red500, red300, yellow500, white } from 'material-ui/styles/colors.js'

class DataInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            values: this.props.values && Reflect.ownKeys(this.props.values).map(k => [k, this.props.values[k]]) || []
        }
    }

    deleteValue (i, e) {
        let {values} = this.state;
        values.splice(i, 1);
        this.setState({values});
    }

    updateValue (i, e) {
        let {values} = this.state;
        values[i][1] = e.target.value;
        this.setState({values});
    }

    updateKey (i, e) {
        let {values} = this.state;
        values[i][0] = e.target.value;
        this.setState({values});
    }

    addValue () {
        let {values} = this.state;
        values.push([]);
        this.setState({values});
    }

    componentDidUpdate () {
        this.props.onChange(this.state.values);
    }

    render () {
        let _this = this;
        return (
            <div>
                {
                    this.state.values.map((v, i) => {
                        return (
                            <div key={i} >
                                <TextField hintText="Key" defaultValue={v[0]} onChange={_this.updateKey.bind(_this, i)} />
                                <TextField hintText="Value" defaultValue={v[1]} onChange={_this.updateValue.bind(_this, i)} />
                                <IconButton
                                    tooltip="Delete"
                                    onTouchTap={this.deleteValue.bind(this, i)}>
                                    <FontIcon className="fa fa-times-circle" color={red500} />
                                </IconButton>
                            </div>
                        );
                    })
                }
                 <FlatButton label="Add Value" primary={true} onTouchTap={this.addValue.bind(this)} />
            </div>
        );
    }
}

export default DataInput;