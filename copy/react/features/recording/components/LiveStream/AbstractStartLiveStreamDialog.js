// @flow

import React, { Component } from 'react';

import {
    createRecordingDialogEvent,
    sendAnalytics
} from '../../../analytics';
import { Dialog } from '../../../base/dialog';
import { JitsiRecordingConstants } from '../../../base/lib-jitsi-meet';

/**
 * The type of the React {@code Component} props of
 * {@link AbstractStartLiveStreamDialog}.
 */
export type Props = {

    /**
     * The {@code JitsiConference} for the current conference.
     */
    _conference: Object,

    /**
     * The ID for the Google client application used for making stream key
     * related requests.
     */
    _googleApiApplicationClientID: string,

    /**
     * The current state of interactions with the Google API. Determines what
     * Google related UI should display.
     */
    _googleAPIState: number,

    /**
     * The email of the user currently logged in to the Google web client
     * application.
     */
    _googleProfileEmail: string,

    /**
     * The live stream key that was used before.
     */
    _streamKey: string,

    /**
     * The Redux dispatch function.
     */
    dispatch: Function,

    /**
     * Invoked to obtain translated strings.
     */
    t: Function
}

/**
 * The type of the React {@code Component} state of
 * {@link AbstractStartLiveStreamDialog}.
 */
export type State = {

    /**
     * Details about the broadcasts available for use for the logged in Google
     * user's YouTube account.
     */
    broadcasts: ?Array<Object>,

    /**
     * The error type, as provided by Google, for the most recent error
     * encountered by the Google API.
     */
    errorType: ?string,

    /**
     * The boundStreamID of the broadcast currently selected in the broadcast
     * dropdown.
     */
    selectedBoundStreamID: ?string,

    /**
     * The selected or entered stream key to use for YouTube live streaming.
     */
    streamKey: string
};

/**
 * Implements an abstract class for the StartLiveStreamDialog on both platforms.
 *
 * NOTE: Google log-in is not supported for mobile yet for later implementation
 * but the abstraction of its properties are already present in this abstract
 * class.
 */
export default class AbstractStartLiveStreamDialog
    extends Component<Props, State> {
    _isMounted: boolean;

    /**
     * Constructor of the component.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        this.state = {
            broadcasts: undefined,
            errorType: undefined,
            selectedBoundStreamID: undefined,
            streamKey: ''
        };

        /**
         * Instance variable used to flag whether the component is or is not
         * mounted. Used as a hack to avoid setting state on an unmounted
         * component.
         *
         * @private
         * @type {boolean}
         */
        this._isMounted = false;

        this._onCancel = this._onCancel.bind(this);
        this._onStreamKeyChange = this._onStreamKeyChange.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
    }

    /**
     * Implements {@link Component#componentDidMount()}. Invoked immediately
     * after this component is mounted.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidMount() {
        this._isMounted = true;

        if (this.props._googleApiApplicationClientID) {
            this._onInitializeGoogleApi();
        }
    }

    /**
     * Implements React's {@link Component#componentWillUnmount()}. Invoked
     * immediately before this component is unmounted and destroyed.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        this._isMounted = false;
    }

    /**
     * Implements {@code Component}'s render.
     *
     * @inheritdoc
     */
    render() {
        return (
            <Dialog
                cancelTitleKey = 'dialog.Cancel'
                okTitleKey = 'dialog.startLiveStreaming'
                onCancel = { this._onCancel }
                onSubmit = { this._onSubmit }
                titleKey = 'liveStreaming.start'
                width = { 'small' }>
                {
                    this._renderDialogContent()
                }
            </Dialog>
        );
    }

    _onCancel: () => boolean;

    /**
     * Invokes the passed in {@link onCancel} callback and closes
     * {@code StartLiveStreamDialog}.
     *
     * @private
     * @returns {boolean} True is returned to close the modal.
     */
    _onCancel() {
        sendAnalytics(createRecordingDialogEvent('start', 'cancel.button'));

        return true;
    }

    /**
     * Asks the user to sign in, if not already signed in, and then requests a
     * list of the user's YouTube broadcasts.
     *
     * NOTE: To be implemented by platforms.
     *
     * @private
     * @returns {Promise}
     */
    _onGetYouTubeBroadcasts: () => Promise<*>;

    /**
     * Loads the Google client application used for fetching stream keys.
     * If the user is already logged in, then a request for available YouTube
     * broadcasts is also made.
     */
    _onInitializeGoogleApi: () => Object;

    _onStreamKeyChange: string => void;

    /**
     * Callback invoked to update the {@code StartLiveStreamDialog} component's
     * display of the entered YouTube stream key.
     *
     * @param {string} streamKey - The stream key entered in the field.
     * changed text.
     * @private
     * @returns {void}
     */
    _onStreamKeyChange(streamKey) {
        this._setStateIfMounted({
            streamKey,
            selectedBoundStreamID: undefined
        });
    }

    _onSubmit: () => boolean;

    /**
     * Invokes the passed in {@link onSubmit} callback with the entered stream
     * key, and then closes {@code StartLiveStreamDialog}.
     *
     * @private
     * @returns {boolean} False if no stream key is entered to preventing
     * closing, true to close the modal.
     */
    _onSubmit() {
        const { broadcasts, selectedBoundStreamID } = this.state;
        const key = this.state.streamKey || this.props._streamKey;

        if (!key) {
            return false;
        }

        let selectedBroadcastID = null;

        if (selectedBoundStreamID) {
            const selectedBroadcast = broadcasts && broadcasts.find(
                broadcast => broadcast.boundStreamID === selectedBoundStreamID);

            selectedBroadcastID = selectedBroadcast && selectedBroadcast.id;
        }

        sendAnalytics(
            createRecordingDialogEvent('start', 'confirm.button'));

        this.props._conference.startRecording({
            broadcastId: selectedBroadcastID,
            mode: JitsiRecordingConstants.mode.STREAM,
            streamId: key
        });

        return true;
    }

    /**
     * Updates the internal state if the component is still mounted. This is a
     * workaround for all the state setting that occurs after ajax.
     *
     * @param {Object} newState - The new state to merge into the existing
     * state.
     * @private
     * @returns {void}
     */
    _setStateIfMounted(newState) {
        if (this._isMounted) {
            this.setState(newState);
        }
    }

    /**
     * Renders the platform specific dialog content.
     *
     * @returns {React$Component}
     */
    _renderDialogContent: () => React$Component<*>
}

/**
 * Maps part of the Redux state to the component's props.
 *
 * @param {Object} state - The Redux state.
 * @returns {{
 *     _conference: Object,
 *     _googleApiApplicationClientID: string,
 *     _streamKey: string
 * }}
 */
export function _mapStateToProps(state: Object) {
    return {
        _conference: state['features/base/conference'].conference,
        _googleApiApplicationClientID:
            state['features/base/config'].googleApiApplicationClientID,
        _googleAPIState: state['features/google-api'].googleAPIState,
        _googleProfileEmail: state['features/google-api'].profileEmail,
        _streamKey: state['features/recording'].streamKey
    };
}
