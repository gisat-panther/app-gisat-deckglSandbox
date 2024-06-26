// src/maps/MapApp1.jsx
import React, { useEffect, useState } from 'react';
import { DeckGL } from 'deck.gl';
import { MapView } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import {BitmapLayer, GeoJsonLayer} from '@deck.gl/layers';
import * as dat from 'dat.gui';
import {_TerrainExtension as TerrainExtension, PathStyleExtension} from "@deck.gl/extensions";

const INITIAL_VIEW_STATE = {
    longitude: 14.437713740781064,
    latitude: 50.05105178409062,
    zoom: 15,
    pitch: 40,
    bearing: 0,
};

const breakDateColors = {
    20220331: [253, 231, 37],
    20220430: [171, 220, 50],
    20220531: [93, 201, 98],
    20220630: [39, 174, 128],
    20230730: [32, 144, 141],
    20230831: [43, 114, 142],
    20230930: [58, 82, 139],
    20231031: [70, 44, 123],
};

// Layer configurations
const layerConfigs = [
    {
        id: 'tile-layer',
        type: TileLayer,
        options: {
            visible:true,
            data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            minZoom: 0,
            maxZoom: 19,
            tileSize: 256,
            renderSubLayers: (props) => {
                const { bbox: { west, south, east, north } } = props.tile;
                return new BitmapLayer(props, {
                    data: null,
                    image: props.data,
                    bounds: [west, south, east, north],
                });
            },
        },
        name: 'Tile Layer',
    },
    {
        id: 'razba-zona',
        type: GeoJsonLayer,
        options: {
            data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/app-esa3DFlusMetroD/dev/vectors/razba_zona-ovlivneni_buffer_chronologie.geojson',
            filled: true,
            pickable: true,
            getFillColor: (d) => breakDateColors[d.properties.BREAKDATE] || [0, 0, 0, 0],
            stroked: true,
            visible: true,
            getLineColor: [15,15,15],
            getLineWidth: 0.5,
        },
        name: 'Chronology',
    },
    {
        id: 'razba-osa',
        type: GeoJsonLayer,
        options: {
            data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/app-esa3DFlusMetroD/dev/vectors/razba_osa.geojson',
            pickable: true,
            stroked: true,
            getLineColor: [15, 15, 15],
            getLineWidth: 2,
            getDashArray: [3, 2],
            dashJustified: true,
            visible: true,
            dashGapPickable: true,
            extensions: [ new PathStyleExtension({dash: true})]
        },
        name: 'Axis',
    },
];

// Function to create a layer based on its configuration, visibility, and properties
const createLayer = (config, visibility, properties) => {
    const options = { ...config.options, id: config.id, visible: visibility };
    if (properties) {
        Object.keys(properties).forEach((key) => {
            options[key] = properties[key];
        });
    }
    return new config.type(options);
};

function MapApp1() {
    // Initial visibility state and layer properties for all layers
    const initialVisibility = layerConfigs.reduce((acc, config) => {
        acc[config.id] = config.options.visible;
        return acc;
    }, {});

    const initialProperties = layerConfigs.reduce((acc, config) => {
        if (config.controls) {
            acc[config.id] = {};
            Object.keys(config.controls).forEach(key => {
                acc[config.id][key] = config.options[key];
            });
        }
        return acc;
    }, {});

    const [layerVisibility, setLayerVisibility] = useState(initialVisibility);
    const [layerProperties, setLayerProperties] = useState(initialProperties);

    // Update the layers array based on visibility and properties state
    const layers = layerConfigs.map(config => createLayer(config, layerVisibility[config.id], layerProperties[config.id]));

    useEffect(() => {
        // Initialize dat.gui
        const gui = new dat.GUI();

        // Add visibility controls for each layer
        layerConfigs.forEach(config => {
            gui.add(layerVisibility, config.id).name(config.name).onChange((value) => {
                setLayerVisibility((prevState) => ({
                    ...prevState,
                    [config.id]: value,
                }));
            });
        });

        // Cleanup dat.gui on unmount
        return () => {
            gui.destroy();
        };
    }, []);

    return (
        <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={true}
            views={new MapView({ repeat: true })}
            layers={layers}
            className="deckgl-map"
        >
        </DeckGL>
    );
}

export default MapApp1;
