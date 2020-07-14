/*!
 * @pixi-essentials/mixin-smart-mask - v1.0.0
 * Compiled Tue, 14 Jul 2020 17:57:17 UTC
 *
 * @pixi-essentials/mixin-smart-mask is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
'use strict';

var display = require('@pixi/display');
var math = require('@pixi/math');
var objectPool = require('@pixi-essentials/object-pool');

// Shared rectangle pool
var rectanglePool = objectPool.ObjectPoolFactory.build(math.Rectangle);
// Temp bounds object to calculate the display-object's content bounds
var tempBounds = new display.Bounds();
// Temp rect to store children bounds
var tempRect = new math.Rectangle();
// Empty array to swap children
var EMPTY_ARRAY = [];
/**
 * It enable smart-masking, set this property. Before rendering the scene graph, you must invoke
 * {@code updateSmartMask} on each display-object to enable masking.
 *
 * @type {PIXI.DisplayObject}
 */
display.DisplayObject.prototype.smartMask = null;
/**
 * Update the mask of the display-object based on whether its unmasked bounds are not a subset of the
 * smart-mask's bounds or are.
 *
 * NOTE: Setting the smart-mask to null will not remove the mask on the display-object, if it has already
 * been enabled.
 *
 * @method PIXI.DisplayObject#updateSmartMask
 * @param recursive - whether to update the smart-masks of the children as well. Traversing the scene
 *      graph on your own is less optimized due to bounds recalculations.
 * @param skipUpdate - whether to not recalculate the transforms of each display-object. This is false
 *      by default because it is expected you will do this on your own.
 */
display.DisplayObject.prototype.updateSmartMask = function updateSmartMask(recursive, skipUpdate) {
    if (recursive === void 0) { recursive = true; }
    if (skipUpdate === void 0) { skipUpdate = true; }
    if (!this.smartMask) {
        if (recursive) {
            return this.getBounds(skipUpdate, rectanglePool.allocate());
        }
        return null;
    }
    var smartMask = this.smartMask;
    var maskBounds = rectanglePool.allocate();
    var unmaskedTargetBounds = rectanglePool.allocate();
    smartMask.getBounds(skipUpdate, maskBounds);
    if (!skipUpdate) {
        this._recursivePostUpdateTransform();
        if (!this.parent) {
            this.parent = this._tempDisplayObjectParent;
            this.displayObjectUpdateTransform();
            this.parent = null;
        }
        else {
            this.displayObjectUpdateTransform();
        }
    }
    // Match Container.calculateBounds except for not using the mask's bounds
    if (this.filterArea) {
        unmaskedTargetBounds.copyFrom(this.filterArea);
    }
    else {
        var originalBounds = this._bounds;
        var originalChildren = this.children;
        tempBounds.clear();
        this._bounds = tempBounds;
        this.children = EMPTY_ARRAY;
        this.calculateBounds();
        this._bounds = originalBounds;
        this.children = originalChildren;
        // copyFrom needed if Rectangle.EMPTY is returned
        unmaskedTargetBounds.copyFrom(tempBounds.getRectangle(unmaskedTargetBounds));
    }
    var children = this.children;
    if (children && children.length) {
        // Use recursion to both update the smart-masks of children & calculate the unmasked target bounds
        if (recursive) {
            for (var i = 0, j = children.length; i < j; i++) {
                var child = children[i];
                if (!child.renderable || !child.visible) {
                    continue;
                }
                var childBounds = child.updateSmartMask(true, skipUpdate);
                unmaskedTargetBounds.enlarge(childBounds);
                rectanglePool.release(childBounds); // Recursive updates require the caller to release the returned rectangle
            }
        }
        else {
            for (var i = 0, j = children.length; i < j; i++) {
                var child = children[i];
                if (!child.renderable || !child.visible) {
                    continue;
                }
                unmaskedTargetBounds.enlarge(child.getBounds(skipUpdate, tempRect));
            }
        }
    }
    if (unmaskedTargetBounds.left < maskBounds.left
        || unmaskedTargetBounds.top < maskBounds.top
        || unmaskedTargetBounds.right > maskBounds.right
        || unmaskedTargetBounds.bottom > maskBounds.bottom) {
        this.mask = smartMask;
    }
    else {
        this.mask = null;
    }
    if (recursive) {
        unmaskedTargetBounds.fit(maskBounds);
        rectanglePool.release(maskBounds);
        // NOTE: Recursive updates expect the caller to release to the child's calculated bounds rectangle.
        return unmaskedTargetBounds;
    }
    rectanglePool.release(maskBounds);
    rectanglePool.release(unmaskedTargetBounds);
    return null;
};
//# sourceMappingURL=smart-mask.js.map