<?php
/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
namespace NeatComet\api;

use NeatComet\bindings\OrmBindingType;
use yii\db\ActiveRecord;

class SampleBaseAppModel extends ActiveRecord {

    public function afterSave($insert, $changedAttributes) {

        parent::afterSave($insert, $changedAttributes);


        // #### Insert this ############################################################################################

        // TODO: filter attributes

        \Yii::$app->neatComet->server->broadcastEvent(
            // Route
            get_class($this), OrmBindingType::SAVE_EVENT,
            // Params
            $this->primaryKey, $this->attributes, $insert ? null : $changedAttributes
        );

        // #############################################################################################################
    }

    public function afterDelete() {

        parent::afterDelete();


        // #### Insert this ############################################################################################

        \Yii::$app->neatComet->server->broadcastEvent(
            // Route
            get_class($this), OrmBindingType::DELETE_EVENT,
            // Params
            $this->primaryKey, $this->attributes
        );

        // #############################################################################################################
    }

}
