
import React, { Component } from 'react';
import { connect } from 'react-redux';
import ActionView from './ActionView';
import ScoringView from './ScoringView';


export default class CornerJudge extends Component {
	
	render() {
		return (
			<div>
				{this.renderView()}
			</div>
		);
	}
	
	renderView() {
		if (!this.props.isAuthorised) {
			return <ActionView 
						isIdentified={this.props.isIdentified}
						joinedRing={this.props.joinedRing}
						rings={this.props.rings} />
		} else {
			return <ScoringView maxScore={this.props.maxScore} />
		}
	}
	
}

// Determine which props to inject given the global state
function mapStateToProps(state) {
	return state.toJS();
}

export default connect(mapStateToProps)(CornerJudge);
