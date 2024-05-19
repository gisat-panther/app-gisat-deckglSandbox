// src/maps/MapApp1.jsx
import React from 'react';
import { DeckGL } from 'deck.gl';
import { MapView } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { MVTLayer } from "@deck.gl/geo-layers";
import { PointCloudLayer } from '@deck.gl/layers';
import geolib from "@gisatcz/deckgl-geolib";
import chroma from "chroma-js";

const CogTerrainLayer = geolib.CogTerrainLayer;

const colorScale = chroma
    .scale(['#fda34b', '#ff7882', '#c8699e', '#7046aa', '#0c1db8', '#2eaaac'])
    .domain([-30, 30]);

const INITIAL_VIEW_STATE = {
    longitude: 14.015511800867504,
    latitude: 50.571906640192161,
    zoom: 13,
    pitch: 0,
    bearing: 0,
};

const layers = [
    new CogTerrainLayer(
        {
            id: 'CogTerrainLayerD8Dem',
            elevationData:  'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/LITC52_53_4g_5m_4326_cog_nodata.tif',
            // onClick: onRasterLayerClick,
            minZoom: 12,
            maxZoom: 14,
            meshMaxError: 5,
            opacity: 1,
            isTiled: true,
            useChannel: null,
            tileSize: 256,
            multiplier: 1.0,
            // operation: 'terrain+draw'
        },
        {
            type: 'terrain',
            multiplier: 1,
            useChannel: null,
            terrainSkirtHeight: 1,
        },
    ),

    new TileLayer({
        data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        id: 'standard-tile-layer',
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,

        renderSubLayers: (props) => {
            const {
                bbox: {
                    west, south, east, north,
                },
            } = props.tile;

            return new BitmapLayer(props, {
                data: null,
                image: props.data,
                bounds: [west, south, east, north],
            });
        },
    }),
    new MVTLayer({
        // data ascending
        data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/InSAR/trim_d8_ASC_upd3_psd_los_4326_height/{z}/{x}/{y}.pbf',
        // data descending
        // data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/InSAR/trim_d8_DESC_upd3_psd_los_4326_height/{z}/{x}/{y}.pbf',
        binary: false,
        renderSubLayers: (props) => {
            if (props.data) {
                return new PointCloudLayer({
                    ...props,
                    id: `${props.id}-sphere`,
                    pickable: false,
                    sizeUnits: 'meters',
                    pointSize: 7,
                    getPosition: (d) => [...d.geometry.coordinates, d.properties.h],
                    // druha varianta s atributem h_dtm, podle H.Kolomaznika se to musi otestovat co bude vypadat lepe
                    // getPosition: (d) => [...d.geometry.coordinates, d.properties.h_dtm],
                    getColor: (d) => [...colorScale(d.properties.vel_rel).rgb(), 255],
                });
            }
            return null;
        },
        minZoom: 8,
        maxZoom: 14,
    })
]
function MapApp1() {
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
