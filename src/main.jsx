import { render } from 'preact';
import { App } from './app.jsx';
import './styles/index.css';

// Mount the Preact app into the #app container
render(<App />, document.getElementById('app'));
