import React, {Component, PropTypes} from 'react';

import Vex from 'vexflow';
import {pitchesToStaveNote} from '../utils/VexFlowUtils';

/*
 * Engrave a chord and display it!
 *
 * This involves a bit of hackery and goes outside the React lifecycle;
 * in particular, VexFlow expects to render into an existing DOM node
 * so we have to create one as a 'ref' during 'render'
 * and then actually render into it in 'componentDidMount'.
 * Not a big deal, though;
 * one intended use of the lifecycle methods
 * is dealing with legacy or external code, which this is.
 */
export default class ChordEngraving extends Component {

    render() {
        if (this._shouldRenderNote()) {
            return <div ref="outer" style={{ display: "inline-block" }} />;
        } else {
            return <div style={{ width: this.props.width }}>
                The notes in this chord are way off the piano!
            </div>;
        }
    }

    _shouldRenderNote() {
        return true;
    }

    componentDidMount() {
        if (this._shouldRenderNote()) {
            this._renderNote();
        }
    }

    componentDidUpdate() {
        if (this._shouldRenderNote()) {
            this._renderNote();
        }
    }

    _renderNote() {
        const {notes, width} = this.props;
        const chord = pitchesToStaveNote(notes);

        // VexFlow supports, you know, actual music,
        // which generally comprises multiple notes in sequence.
        // So we need to wrap this in a singleton array.
        const chords = [chord];

        const svgContainer = document.createElement('div');
        const renderer = new Vex.Flow.Renderer(svgContainer,
            Vex.Flow.Renderer.Backends.SVG);
        const ctx = renderer.getContext();
        const stave = new Vex.Flow.Stave(0, 0, width);
        stave.addClef("treble").setContext(ctx).draw();
        Vex.Flow.Formatter.FormatAndDraw(ctx, stave, chords);

        // Clear container before adding anything.
        const container = this.refs.outer;
        while (container.childNodes.length > 0) {
            container.removeChild(container.childNodes[0]);
        }
        container.appendChild(svgContainer);

        const svg = svgContainer.childNodes[0];

        // We can only get the bounding box once the SVG is fully in the DOM;
        // that is, 'svg' is in 'svgContainer',
        // and 'svgContainer' is in the mounted ref.
        const boundingBox = svg.getBBox();

        svg.style.top = -boundingBox.y + "px";
        svg.style.height = boundingBox.height;
        svg.style.left = "0px";
        svg.style.width = width + "px";
        svg.style.position = "absolute";
        svg.style.overflow = "visible";

        // The margin/padding/positioning stuff we're doing here
        // works optically, and the SVG looks correct,
        // but apparently it's still pushed pretty far down in the DOM.
        // This can interfere with pointer events
        // because the SVG can block the mouse cursor.
        // We can fix that by just not capturing such events.
        svg.style.pointerEvents = "none";

        svgContainer.style.height = boundingBox.height + "px";
        svgContainer.style.width = width + "px";
        svgContainer.style.position = "relative";
        svgContainer.style.display = "inlineBlock";
    }

}
ChordEngraving.propTypes = {
    // Semitones above middle C.
    notes: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,

    // Width of the staff output, in pixels.
    width: PropTypes.number,
};
ChordEngraving.defaultProps = {
    width: 100,
};
