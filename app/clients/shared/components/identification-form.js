
import React, { Component } from 'react';


export default class IdentificationForm extends Component {
	
	render() {
		const { type, ...other } = this.props;
		
		return (
			<form className="form" action="#">
				<input className="field" type={type} {...other} />
				<button className="btn btn--go" type="submit" title="Go">&raquo;</button>
			</form>
		);
	}
	
}
