require("babel-polyfill");

import React from 'react';
import ReactDOM from 'react-dom';
/*
import {createStore} from 'redux';
import {Provider} from 'react-redux';
import Reducer from './core/Reducers';

import LocalStore from './middleware/LocalStore';
window.LocalStore = LocalStore;
import setUpLocalStoreReduxInterface
    from './middleware/LocalStoreReduxInterface';

const store = createStore(Reducer);
setUpLocalStoreReduxInterface(store);

import App from './components/App';
const component = <Provider store={store}>
    <App />
</Provider>;
*/
import App from './components/App';
const component = <App />

ReactDOM.render(component, document.getElementById('app'));
