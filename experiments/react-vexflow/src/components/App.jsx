import React, {Component} from 'react';
import {Router, Route, Redirect} from 'react-router';

import ChordEngraving from './ChordEngraving';

export default class App extends Component {
    render() {
        return <div>
          <ChordEngraving notes={[0, 4, 7]} />
        </div>;
    }
}
