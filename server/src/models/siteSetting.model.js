module.exports = (sequelize, DataTypes) => {
  const SiteSetting = sequelize.define(
    "SiteSetting",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "site_settings",
      timestamps: false,
    },
  )

  return SiteSetting
}

