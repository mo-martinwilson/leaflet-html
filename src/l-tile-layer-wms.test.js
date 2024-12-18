// @vitest-environment happy-dom
import { tileLayer } from "leaflet";
import { it, expect } from "vitest";
import { layerConnected } from "./events";
import "./index";

it("should create an l-tile-layer-wms with the correct options", async () => {
  const urlTemplate = "http://ows.mundialis.de/services/service?";
  const el = document.createElement("l-tile-layer-wms");
  el.setAttribute("url-template", urlTemplate);
  el.setAttribute("layers", "example-wms-layer");

  let promise = new Promise((resolve) => {
    el.addEventListener(layerConnected, (ev) => {
      resolve(ev.detail);
    });
  });
  document.body.appendChild(el);

  const actual = await promise;
  const expected = {
    name: null,
    layer: tileLayer.wms(urlTemplate, { layers: "example-wms-layer" }),
  };
  expect(actual).toEqual(expected);
});

it.each([
  ["http://example.com/wms", "styles", "default"],
  ["http://example.com/wms", "format", "image/png"],
  ["http://example.com/wms", "transparent", "true"],
])("should handle WMS options %s %s", (urlTemplate, key, value) => {
  const el = document.createElement("l-tile-layer-wms");
  el.setAttribute("url-template", urlTemplate);
  el.setAttribute("layers", "example layer ere");
  el.setAttribute(key, value);
  document.body.appendChild(el);

  const actual = el.layer;
  const expected = tileLayer.wms(urlTemplate, {
    layers: "example layer ere",
    [key]: value,
  });
  expect(actual).toEqual(expected);
});

it("should support attribution", () => {
  const urlTemplate = "http://example.com/wms";
  const attribution = "&copy; OpenStreetMap contributors";
  const layers = "example-wms-layer";
  const el = document.createElement("l-tile-layer-wms");
  el.setAttribute("url-template", urlTemplate);
  el.setAttribute("attribution", attribution);
  el.setAttribute("layers", layers);
  document.body.appendChild(el);

  const actual = el.layer;
  const expected = tileLayer.wms(urlTemplate, { attribution, layers });
  expect(actual).toEqual(expected);
});

it("should parse valid JSON in the options attribute", () => {
  const urlTemplate = "http://example.com/wms";
  const options = '{"height": 101, "bbox": "coords ere"}';
  const el = document.createElement("l-tile-layer-wms");
  el.setAttribute("url-template", urlTemplate);
  el.setAttribute("layers", "example layer ere");
  el.setAttribute("options", options);
  document.body.appendChild(el);

  const actual = el.layer;
  const expected = tileLayer.wms(urlTemplate, {
    layers: "example layer ere",
    height: 101,
    bbox: "coords ere",
  });
  expect(actual).toEqual(expected);
});

it("should handle invalid JSON in the options attribute gracefully", () => {
  const urlTemplate = "http://example.com/wms";
  const invalidJson = '{"height": 10, "bbox": "coords ere"'; // <- missing closing brace
  const el = document.createElement("l-tile-layer-wms");
  el.setAttribute("url-template", urlTemplate);
  el.setAttribute("layers", "example layer ere");
  el.setAttribute("options", invalidJson);
  document.body.appendChild(el);

  // Expect layer creation to succeed but without additional options
  const actual = el.layer;
  const expected = tileLayer.wms(urlTemplate, { layers: "example layer ere" });
  expect(actual).toEqual(expected);
});

it("should reload the layer when the options attribute changes", async () => {
  const urlTemplate = "http://example.com/wms";
  const initialOptions = JSON.stringify({ height: 101, bbox: "coords ere" });
  const updatedOptions = JSON.stringify({ height: 202, bbox: "new coords" });

  const el = document.createElement("l-tile-layer-wms");
  el.setAttribute("url-template", urlTemplate);
  el.setAttribute("layers", "example layer ere");
  el.setAttribute("options", initialOptions);

  let layerConnectedEventEmittedCount = 0;
  let promise = new Promise((resolve) => {
    el.addEventListener(layerConnected, (ev) => {
      layerConnectedEventEmittedCount += 1;
      resolve(ev.detail);
    });
  });

  document.body.appendChild(el);

  // Wait for the initial layer to be created
  let detail = await promise;
  expect(detail.layer.options.height).toBe(101);
  expect(detail.layer.options.bbox).toBe("coords ere");

  // Change the options attribute
  promise = new Promise((resolve) => {
    el.addEventListener(layerConnected, (ev) => {
      resolve(ev.detail);
    });
  });

  // Update the options attribute
  el.setAttribute("options", updatedOptions);

  // Wait for the layer to reload
  detail = await promise;
  expect(detail.layer.options.height).toBe(202);
  expect(detail.layer.options.bbox).toBe("new coords");
  expect(layerConnectedEventEmittedCount).toBe(2); // initial layer creation + reload
});

it("should not reload the layer when non-options attributes are changed", async () => {
  const urlTemplate = "http://example.com/wms";
  const initialOptions = JSON.stringify({ height: 101, bbox: "coords ere" });

  const el = document.createElement("l-tile-layer-wms");
  el.setAttribute("url-template", urlTemplate);
  el.setAttribute("layers", "example layer ere");
  el.setAttribute("options", initialOptions);

  let layerConnectedEventEmittedCount = 0;
  let promise = new Promise((resolve) => {
    el.addEventListener(layerConnected, (ev) => {
      layerConnectedEventEmittedCount += 1;
      resolve(ev.detail);
    });
  });

  document.body.appendChild(el);

  // Wait for the initial layer to be created
  let detail = await promise;
  expect(detail.layer.options.height).toBe(101);
  expect(detail.layer.options.bbox).toBe("coords ere");

  // Update the a different attribute to options
  el.setAttribute("a-different-attribute", "with different value");

  // Give the layer a chance to reload
  detail = await promise;
  expect(detail.layer.options.height).toBe(101);
  expect(detail.layer.options.bbox).toBe("coords ere");
  expect(layerConnectedEventEmittedCount).toBe(1); // initial layer creation only
});
